#!/usr/bin/env python3
import fnmatch
import json
import os
import shutil

from typing import List

THIS_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_ROOT_DIR = os.path.realpath(os.path.join(THIS_DIR, "..", "..", ".."))

DATA_LOCAL_DIR = os.environ.get("DATA_LOCAL_DIR",os.path.realpath(os.path.join(PROJECT_ROOT_DIR,"data_local")))
DATASETS_JSON_PATH = os.path.realpath(os.path.join(DATA_LOCAL_DIR, "_generated", "datasets.json"))
SETTINGS_JSON_PATH = os.path.realpath(os.path.join(DATA_LOCAL_DIR, "settings.json"))

print(f"DATA_LOCAL_DIR = {DATA_LOCAL_DIR}")

def find_files(pattern, here):
    for path, dirs, files in os.walk(os.path.abspath(here)):
        for filename in fnmatch.filter(files, pattern):
            yield os.path.join(path, filename)


def find_dirs(here):
    for path, dirs, _ in os.walk(os.path.abspath(here)):
        for dirr in dirs:
            yield os.path.join(path, dirr)


def find_dirs_here(here):
    return filter(os.path.isdir, [os.path.join(here, e) for e in os.listdir(here)])


if __name__ == '__main__':
    print("indexing...")
    with open(SETTINGS_JSON_PATH, 'r') as f:
        settings_json = json.load(f)

    settings = settings_json
    defaultDatasetName = settings['defaultDatasetName']
    defaultDatasetNameFriendly = None

    datasets = []
    for dataset_json_path in find_files(pattern="dataset.json", here=DATA_LOCAL_DIR):
        print(f"dataset_json_path: {dataset_json_path}")
        with open(dataset_json_path, 'r') as f:
            dataset_json: dict = json.load(f)

        dataset_name = dataset_json["name"]
        if dataset_name == defaultDatasetName:
            defaultDatasetNameFriendly = dataset_json['nameFriendly']

        dir = os.path.dirname(dataset_json_path)
        versions: List[dict] = []
        for meta_path in find_files("metadata.json",dir):
            print(f"meta_path: {meta_path}")
            with open(meta_path, 'r') as f:
                version_json: dict = json.load(f)
            versions.append(version_json)
        versions.sort(key=lambda x: x["datetime"],reverse=True)
        dataset_json["versions"] = versions

        for version in versions:
            version_datetime = version["datetime"]
            versions_dir = f"{dataset_name}/versions"
            files_dir = f"{versions_dir}/{version_datetime}/files"
            files = {f"{filetype}": f"/{files_dir}/{filename}" for
                     filetype, filename in version['files'].items()}

            zip_dir = f"{versions_dir}/{version_datetime}/zip-bundle"
            zip_base = f"nextclade_dataset_{dataset_name}_{version_datetime}"
            zip_filename = f"{zip_base}.zip"

            zip_base_path = os.path.join(DATA_LOCAL_DIR, zip_dir, zip_base)
            os.makedirs(os.path.dirname(zip_base_path), exist_ok=True)
            shutil.make_archive(
                base_name=zip_base_path,
                format='zip',
                root_dir=os.path.realpath(os.path.join(DATA_LOCAL_DIR, files_dir))
            )
            version.update({"files": files, "zipBundle": f"/{zip_dir}/{zip_filename}"})

        datasets.append(dataset_json)

    settings.update({'defaultDatasetNameFriendly': defaultDatasetNameFriendly})

    datasets_json = dict()
    datasets_json.update({"settings": settings})
    datasets_json.update({"datasets": datasets})
    os.makedirs(os.path.dirname(DATASETS_JSON_PATH), exist_ok=True)
    with open(DATASETS_JSON_PATH, "w") as f:
        json.dump(datasets_json, f, indent=2)
    
    print(f"dumped index to {DATASETS_JSON_PATH}")
