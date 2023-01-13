

class NucMutation:
    def __init__(self, reff, pos, qry):
        self.reff = reff
        self.pos = pos
        self.qry = qry
    def __str__(self):
        return f"{self.reff}{self.pos}{self.qry}"
    def __eq__(self, other):
        return self.reff == other.reff and self.pos == other.pos and self.qry == other.qry
    def __ne__(self, other):
        return  self.pos != other.pos or self.reff != other.reff or self.qry != other.qry
    def __hash__(self):
        return hash((self.reff, self.pos, self.qry))
    def __lt__(self, obj):
        lt = ((self.pos) < (obj.pos) or 
            (self.pos) == (obj.pos) and (self.reff) < (obj.reff) or 
            (self.pos) == (obj.pos) and (self.reff) == (obj.reff) and (self.qry) < (obj.qry))
        return lt
    def __gt__(self, obj):
        gt = ((self.pos) > (obj.pos) or 
            (self.pos) == (obj.pos) and (self.reff) > (obj.reff) or 
            (self.pos) == (obj.pos) and (self.reff) == (obj.reff) and (self.qry) > (obj.qry))
        return gt

def nuc_mut_from_str(string):
    reff = string[0]
    pos = int(string[1:-1])
    qry = string[-1]
    return NucMutation(reff, pos, qry)

def nuc_mut_from_dict(dict_):
    if 'queryNuc' in dict_:
        return NucMutation(dict_['refNuc'], dict_['pos']+1, dict_['queryNuc'])
    else:
        return NucMutation(dict_['ref'], dict_['pos']+1, '-')

def revert(nuc_mut):
    return NucMutation(nuc_mut.qry, nuc_mut.pos, nuc_mut.reff)

def shared_mut(mutations_vector_1, mutations_vector_2):
    shared_mutations_vector = []
    for mut1 in mutations_vector_1:
        for mut2 in mutations_vector_2:
            if mut1 == mut2:
                shared_mutations_vector.append(mut1)
    return shared_mutations_vector

def remove_mut(mutations_vector_1, mutations_vector_2):
    mutations_vector_wo_2 = [ x for x in mutations_vector_1 if (x in mutations_vector_2)==False]
    return mutations_vector_wo_2