import json
import os

import pandas as pd

pd.set_option('display.max_rows', 500)
pd.set_option('display.max_columns', 500)
# pd.set_option('display.width', 10000)
# pd.set_option('display.expand_frame_repr', False)
# pd.set_option('max_colwidth', None)

THIS_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_ROOT_DIR = os.path.realpath(os.path.join(THIS_DIR, '..', '..', '..'))

OUT_DIR = f"{PROJECT_ROOT_DIR}/tmp"
OUT_DIR_OLD = f"{PROJECT_ROOT_DIR}/tmp/old"
OUT_DIR_NEW = f"{PROJECT_ROOT_DIR}/tmp/new"

TSV_OLD = os.path.join(OUT_DIR_OLD, "out.tsv")
TSV_NEW = os.path.join(OUT_DIR_NEW, "out.tsv")


def read_json(filepath):
    with open(filepath, "r") as f:
        return json.loads(f.read())


def read_tsv(filepath):
    return pd.read_csv(
        filepath,
        index_col='seqName',
        sep='\t',
        low_memory=False, na_filter=False
    )


def tsv_diff(new, old, column):
    col_new = new[column]
    col_old = old[column]
    return col_new \
        .compare(col_old) \
        .rename(columns={'self': 'new', 'other': 'old'})


def fix_range(r: str) -> str:
    range_split = r.split('-')

    if range_split is None or len(range_split) == 0 or range_split[0] == '':
        return ''

    begin = int(range_split[0])

    if len(range_split) == 1:
        return f"{begin}"

    end = int(range_split[1]) - 1

    return f"{begin}-{end}"


def fix_old_missing_ranges(ranges_str: str) -> str:
    ranges = ranges_str.split(',')
    return ",".join([fix_range(r) for r in ranges])


def print_with_heading(name, body):
    print(f'\n{"*" * 80}')
    print(f"Differences in \"{name}\"")
    print(f'{"*" * 80}')
    print(body)
    # print(f'{"*" * 80}\n\n')


def compare_tsv_column(new, old, column_name):
    col = tsv_diff(new, old, column_name)
    if not col.empty:
        print_with_heading(column_name, col)


def compare_aa_muts_one(new, old, column_name):
    diff = tsv_diff(new, old, column_name)
    if diff.empty:
        return {}

    result = {}
    for row in diff.iterrows():
        seq_name = row[0]
        new_muts = set(row[1]['new'].split(','))
        old_muts = set(row[1]['old'].split(','))
        result[seq_name] = {
            'seq_name': seq_name,
            'added': list(new_muts - old_muts),
            'removed': list(old_muts - new_muts),
        }

    return result


def get(dic, key1, key2):
    l1 = dic.get(key1)
    if l1 is None:
        return None

    return l1.get(key2)


def compare_aa_muts(new, old):
    subs = compare_aa_muts_one(new, old, 'aaSubstitutions')
    dels = compare_aa_muts_one(new, old, 'aaDeletions')

    seq_names = []
    seq_names += dels.keys()
    seq_names += subs.keys()
    seq_names.sort()

    msg = ''
    for seq_name in seq_names:
        subs_added = ', '.join(get(subs, seq_name, 'added') or '')
        subs_removed = ', '.join(get(subs, seq_name, 'removed') or '')

        dels_added = ', '.join(get(dels, seq_name, 'added') or '')
        dels_removed = ', '.join(get(dels, seq_name, 'removed') or '')

        msg += seq_name
        msg += f"\nAA substitutions added   : {subs_added}"
        msg += f"\nAA substitutions removed : {subs_removed}"
        msg += f"\nAA deletions     added   : {dels_added}"
        msg += f"\nAA deletions     removed : {dels_removed}"
        msg += "\n\n"

    if msg:
        print_with_heading('aaSubstitutions & aaDeletions', msg)


if __name__ == '__main__':
    print("Comparing")
    print(f"  old: {TSV_OLD}")
    print(f"  new: {TSV_NEW}")
    old = read_tsv(TSV_OLD).sort_index()
    new = read_tsv(TSV_NEW).sort_index()

    # JS version has incorrect range ends, fix them here before comparison
    old['missing'] = old['missing'].apply(fix_old_missing_ranges)
    old['deletions'] = old['deletions'].apply(fix_old_missing_ranges)

    compare_tsv_column(new, old, 'missing')
    compare_tsv_column(new, old, 'substitutions')
    compare_tsv_column(new, old, 'deletions')
    compare_tsv_column(new, old, 'insertions')
    compare_tsv_column(new, old, 'nonACGTNs')
    # compare_tsv_column(new, old, 'pcrPrimerChanges')
    compare_tsv_column(new, old, 'clade')

    compare_aa_muts(new, old)

    #  - TODO: identity of node attached to
    #  - TODO: private mutations
