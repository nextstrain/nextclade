import numpy as np

#      012345678901234567890123456789012345678901234567890123
ref = 'TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA'

cds_1 = [{'start': 4, 'end': 37, 'strand': 'forward'}]
cds_2 = [
    {'start': 4,  'end': 21, 'strand': 'forward'},
    # slippage at position 20 -- 20 is read twice
    {'start': 20, 'end': 39, 'strand': 'forward'},
    {'start': 45, 'end': 51, 'strand': 'forward'},  # another cds segment
]

cds_3 = [
    {'start': 45, 'end': 51, 'strand': 'reverse'},  # another cds segment
    {'start': 4,  'end': 21, 'strand': 'reverse'},
]


def cds_nuc_pos_to_ref(pos, cds):
    remaining_pos = pos

    segment_index = 0
    segment = cds[segment_index]
    segment_len = segment['end'] - segment['start']
    while remaining_pos >= segment_len:
        remaining_pos -= segment_len
        segment_index += 1
        segment = cds[segment_index]
        segment_len = segment['end'] - segment['start']

    print("position is in segment", segment_index)
    if segment['strand'] == 'forward':
        return segment['start'] + remaining_pos
    else:
        return segment['end'] - 1 - remaining_pos


def cds_codon_pos_to_ref(codon, cds):
    return cds_nuc_pos_to_ref(codon*3, cds)


def global_ref_pos_to_local(pos, cds):
    cds_segment_start = 0
    cds_positions = []
    for segment in cds:
        if pos >= segment['start'] and pos < segment['end']:
            cds_positions.append(cds_segment_start + pos - segment['start']
                                 if segment['strand'] == 'forward' else
                                 cds_segment_start + (segment['end']-1-pos))
        cds_segment_start += segment['end'] - segment['start']
    return cds_positions


for local_pos, global_pos, cds in [(3, 7, cds_1), (25, 28, cds_2),
                                   (16, 20, cds_2), (17, 20, cds_2),
                                   (0, 50, cds_3), (7, 19, cds_3)]:
    print("global position:", cds_nuc_pos_to_ref(
        local_pos, cds), 'expected:', global_pos)


for global_pos in [2, 4, 20, 38, 39, 45, 50]:
    print()
    for cds in [cds_1, cds_2, cds_3]:
        print(global_pos, "=>", global_ref_pos_to_local(global_pos, cds))
