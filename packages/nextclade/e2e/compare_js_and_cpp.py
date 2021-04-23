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

TREE_OLD = os.path.join(OUT_DIR_OLD, "tree.json")
TREE_NEW = os.path.join(OUT_DIR_NEW, "tree.json")


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


def get_attachment_recursively(node, parent_name, attachment):
    name = node.get('name') or '<no_name>'
    if name.endswith('_new'):
        attachment.update({name: parent_name})

    children = node.get('children') or []
    for child in children:
        get_attachment_recursively(child, node['name'], attachment)


def compare_tree_attachment(tree_new, tree_old):
    attachment_new = dict()
    get_attachment_recursively(tree_new['tree'], '<root>', attachment_new)

    attachment_old = dict()
    get_attachment_recursively(tree_old['tree'], '<root>', attachment_old)

    attachment_new_df = pd.DataFrame.from_dict(attachment_new, orient='index')
    attachment_old_df = pd.DataFrame.from_dict(attachment_old, orient='index')
    comparison = attachment_new_df \
        .compare(attachment_old_df) \
        .rename(columns={'self': 'new', 'other': 'old'})

    if not comparison.empty:
        print_with_heading('Tree node attachment', comparison)


def get_tree_mutations_recursively(node, mutations):
    name = node.get('name') or '<no_name>'
    muts = ((node.get('branch_attrs') or {}).get('mutations') or {}).get('nuc') or []
    if name.endswith('_new'):
        mutations.update({name: muts})

    children = node.get('children') or []
    for child in children:
        get_tree_mutations_recursively(child, mutations)


def compare_tree_mutations(tree_new, tree_old):
    mutations_new = {}
    get_tree_mutations_recursively(tree_new['tree'], mutations_new)

    mutations_old = {}
    get_tree_mutations_recursively(tree_old['tree'], mutations_old)

    seq_names = []
    seq_names += mutations_new.keys()
    seq_names += mutations_old.keys()

    for seq_name in seq_names:
        if not mutations_new.get(seq_name):
            mutations_new[seq_name] = '[]'
        else:
            mutations_new[seq_name] = str(mutations_new[seq_name])

        if not mutations_old.get(seq_name):
            mutations_old[seq_name] = '[]'
        else:
            mutations_old[seq_name] = str(mutations_new[seq_name])

    mutations_new_df = pd.DataFrame.from_dict(mutations_new, orient='index')
    mutations_old_df = pd.DataFrame.from_dict(mutations_old, orient='index')

    comparison = mutations_new_df \
        .compare(mutations_old_df) \
        .rename(columns={'self': 'new', 'other': 'old'})

    if not comparison.empty:
        print_with_heading('Tree mutations', comparison)


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
    compare_tsv_column(new, old, 'pcrPrimerChanges')
    compare_tsv_column(new, old, 'clade')

    compare_aa_muts(new, old)

    tree_new = read_json(TREE_NEW)
    tree_old = read_json(TREE_OLD)

    compare_tree_attachment(tree_new, tree_old)
    compare_tree_mutations(tree_new, tree_old)
