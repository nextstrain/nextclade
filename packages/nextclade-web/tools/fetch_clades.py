import requests
import json
import io
from collections import defaultdict

URL  = "https://raw.githubusercontent.com/nextstrain/ncov/master/config/clades.tsv"

def fetch_clades():
    r  = requests.get(URL)
    if not r.ok:
        print(f"Failed to fetch {URL}", file=sys.stderr)
        r.close()
        return None

    fd  = io.StringIO(r.text)
    header = fd.readline().strip().split('\t')
    clades = defaultdict(list)
    for row in fd:
        header = row.strip().split('\t')
        if len(header)>=4:
            clade, gene, site, allele = header[:4]
            pos = int(site)
            if gene=="nuc":
                clades[clade].append({"pos":pos, "allele":allele})

    return clades


if __name__=="__main__":
    clades = fetch_clades()
    with open('clades.json', 'w') as fh:
        json.dump(clades,fh, indent=2)


