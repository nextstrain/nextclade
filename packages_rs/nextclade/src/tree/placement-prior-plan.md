# Plan to implement placement priors

1. Add a new node attribute that stores how commonly things are attached to that node.
   1. Base it on current number of sequences, maybe some smoothing or not, but start simple, how many good sequences are there (make sure to deal properly with recombinants)
   2. Seems to be easy, as they are automatically added to `other`
2. When calculating placement, add the bias as fractional number -> algorithm can remain mostly unchanged

## Details

- Backwards compatibility: if not present, add 0.999

## Produce pangolin style output for compatibility

## Other ideas

- Don't use terminal N positions for placement -> ignore (set maybe in virus properties?), still want to use them for reversions etc, just not for placement
