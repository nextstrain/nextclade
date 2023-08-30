from Bio import Seq
import numpy as np

#      012345678901234567890123456789012345678901234567890123
ref = 'TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA'

ref_aln = 'TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA'
qry_aln = '-GATGCACACGCATC---TTTAAACGGGTTTGCGGTGTCAGT---GCCCGTCTTACA'



cds_1 = [{'start':4, 'end':37}]
cds_2 = [
    {'start':4, 'end':21},
    {'start':20, 'end':39},  # slippage at position 20 -- 20 is read twice
    {'start':45, 'end':51},  # another cds segment
]



def extract_cds_sequence(cds_annotation, seq):
    '''extract a cds from a raw sequence'''
    cds = ''
    for segment in cds_annotation:
        cds += seq[segment['start']:segment['end']]

    return cds

def extract_cds_alignment(cds_annotation, seq_aln, coord_map):
    cds_aln = ''
    cds_to_aln = []
    rta = coord_map['ref_to_aln']
    for si,segment in enumerate(cds_annotation):
        start = rta[segment['start']]
        end = rta[segment['end']]
        cds_to_aln.append({"global":np.arange(start, end), 'start':len(cds_aln),  "len": end-start})
        cds_aln += seq_aln[start:end]

    return cds_aln, cds_to_aln

def get_aln_to_seq(aln):
    aln_array = np.array(list(aln))
    aln_to_seq = np.cumsum(aln_array!='-') - 1
    aln_to_seq = np.concatenate([aln_to_seq, [aln_to_seq[-1]+1]])
    seq_to_aln = np.arange(len(aln))[aln_array!='-']
    return aln_to_seq, seq_to_aln


def make_coord_map(ref_aln, qry_aln):

    aln_to_ref, ref_to_aln = get_aln_to_seq(ref_aln)
    aln_to_qry, qry_to_aln = get_aln_to_seq(qry_aln)

    return {'aln_to_ref':aln_to_ref, 'aln_to_qry': aln_to_qry, 'ref_to_aln': ref_to_aln}

def cds_to_global_aln_position(pos, cds_to_aln_map):
    '''
    map a position in the extracted alignment of the CDS to the global alignment.
    returns a result for each CDS segment, but a single position can  only be in ONE CDS segment
    '''
    result = []
    for segment in cds_to_aln_map:
        res = {}
        pos_in_segment = pos - segment['start']
        if pos_in_segment<0:
            res['status'] = 'before'
            res['pos'] = np.nan
        elif pos_in_segment>=segment['len']:
            res['status'] = 'after'
            res['pos'] = np.nan
        else:
            res['status'] = 'inside'
            res['pos'] = segment["global"][pos_in_segment]
        result.append(res)

    return result

def cds_to_global_ref_position(pos, cds_to_aln_map, coord_map):
    '''
    map a position in the extracted alignment of the CDS to the reference sequence.
    returns a result for each CDS segment, but a single position can  only be in ONE CDS segment
    '''
    cds_to_aln_res = cds_to_global_aln_position(pos, cds_to_aln_map)
    result = []
    for segment in cds_to_aln_res:
        if segment['status']=='inside':
            result.append({'status':'inside', 'pos':coord_map['aln_to_ref'][segment['pos']]})
        else:
            result.append(segment)
    return result

def cds_to_global_aln_range(start, end, cds_to_aln_map):
    '''
    map a range in the extracted alignment of the CDS to the global alignment.
    returns a result for each CDS segment, as a range can span multiple CDS-segments
    '''
    cds_to_aln_start = cds_to_global_aln_position(start, cds_to_aln_map)
    # need to map end position -1 to correspond to the last included position
    cds_to_aln_end = cds_to_global_aln_position(end-1, cds_to_aln_map)
    result = []
    for seg_start, seg_end, seg_map in zip(cds_to_aln_start, cds_to_aln_end, cds_to_aln_map):
        if seg_end['status']=="before":
            result.append({"status":"before", "start":np.nan, "end":np.nan})
            continue
        if seg_start['status']=="after":
            result.append({"status":"after",  "start":np.nan, "end":np.nan})
            continue

        if seg_start['status']=="before":
            start_pos = seg_map["global"][0]
        elif seg_start['status']=='inside':
            start_pos = seg_start["pos"]

        # map end and increment by one to correspond to open interval
        if seg_end['status']=="after":
            end_pos = seg_map["global"][-1]+1
        elif seg_end['status']=='inside':
            end_pos = seg_end["pos"]+1

        result.append({"status":"covered", "start":start_pos, "end":end_pos})
    return result

def codon_to_global_aln_range(codon, cds_map):
    '''
    expands a codon in the extracted alignment to a range in the global alignment
    '''
    start_pos = codon*3
    end_pos = codon*3 + 3
    return cds_to_global_aln_range(start_pos, end_pos, cds_map)

print('Translation of reference sequence:')
print(Seq.translate(extract_cds_sequence(cds_1, ref)))
print(Seq.translate(extract_cds_sequence(cds_2, ref)))

coord_map = make_coord_map(ref_aln, qry_aln)
print('\nGlobal coordinate map:')
print(coord_map)

cds_aln, cds_map = extract_cds_alignment(cds_2, ref_aln, coord_map)

print('\nExtracted CDS from the alignment:')
print(extract_cds_alignment(cds_2, ref_aln, coord_map)[0])
print(extract_cds_alignment(cds_2, qry_aln, coord_map)[0])


print('\nPosition in the aligned CDS mapped to global alignment:')
print(cds_to_global_aln_position(10,cds_map))
print('\nPosition in the aligned CDS mapped to reference sequence:')
print(cds_to_global_ref_position(10,cds_map, coord_map))

print('\nRange in the aligned CDS mapped to global alignment:')
print(cds_to_global_aln_range(10,15,cds_map))

print('\nCodon in the aligned CDS mapped to global alignment:')
print("5:",codon_to_global_aln_range(5,cds_map))
print("6:",codon_to_global_aln_range(6,cds_map))
print("7:",codon_to_global_aln_range(7,cds_map))
