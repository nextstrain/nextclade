# [0.4.0](https://github.com/neherlab/webclades/compare/0.3.7...0.4.0) (2020-09-01)


### Bug Fixes

* add missing word ([f15af21](https://github.com/neherlab/webclades/commit/f15af2187c4bed93839e2412349f3358809ec73a))
* adjust QC filter to new scoring scheme ([4129947](https://github.com/neherlab/webclades/commit/4129947ad55e5319c63d5058228eb873f7ddd30b))
* adjust reducers, ui and more types for the new results layout ([8520daf](https://github.com/neherlab/webclades/commit/8520dafff1abc4fdba76a654e3bf77547644d2a5))
* avoid unrecoverable failure when a sequence fails to align ([1511d7b](https://github.com/neherlab/webclades/commit/1511d7b512d0ae3e97850ed9bf8b748ef3ae6b0a))
* disable "show tree" button until full results are available ([283dc9e](https://github.com/neherlab/webclades/commit/283dc9e5116eb2887f965e86b7c757f1b7424f8b))
* don't show settings dialog by default ([627a5ae](https://github.com/neherlab/webclades/commit/627a5ae223fed0540a2b614344b3c4c55f9978c9))
* ensure progress bar retains failure state until the end of the run ([796eddf](https://github.com/neherlab/webclades/commit/796eddf00aecc994f1d5181c0f358d2cf2468c1e))
* fix incorrect QC status assignment ([aff806b](https://github.com/neherlab/webclades/commit/aff806bdcbc2793f69670bf497f354e12f49c1d3))
* fix more type errors ([70fd82a](https://github.com/neherlab/webclades/commit/70fd82a91eb4a620d191845b73e6b29f2028c0cd))
* fix text color on OK button ([f8b139d](https://github.com/neherlab/webclades/commit/f8b139dcd84a37ccb51a113ffc3c4ea4f2a3ac96))
* fix type errors ([2108b28](https://github.com/neherlab/webclades/commit/2108b2837f0325c06c10c10739a9a24618f3e812))
* fix typos ([cebcdb3](https://github.com/neherlab/webclades/commit/cebcdb322618b46d76e0e915133d920e53e105bf))
* flip erroneous comparison ([fe2446b](https://github.com/neherlab/webclades/commit/fe2446b9bc8505b2b21620214559ae3fea1c1df3))
* make sure QC strings on tree nodes are being translated ([7c9c96d](https://github.com/neherlab/webclades/commit/7c9c96d330d38f1b0fb0a79450cad3bf1f46bc03))
* make sure to format non-ACGTN ranges for export ([75abfc3](https://github.com/neherlab/webclades/commit/75abfc3f94ebf00179723e2d5c55d3faef203b38))
* make sure tooltips are attached to the right element ([2bccf84](https://github.com/neherlab/webclades/commit/2bccf840769cace36580ba8cb65466030310c1a6))
* make sure tree nodes are properly colored on first tree render ([56662fe](https://github.com/neherlab/webclades/commit/56662fefdf0aedaa1ff399ed81c9bf9f1390d189))
* make sure we find divergent mutations correctly ([6b7be19](https://github.com/neherlab/webclades/commit/6b7be19d7612e06dcec3a9dba270062b2c1fa72c))
* make text casing consistent ([6de96d2](https://github.com/neherlab/webclades/commit/6de96d28f19e384cb2302421122641a6a600561f))
* prevent text from selection on QC status icons ([bd2fb9f](https://github.com/neherlab/webclades/commit/bd2fb9fbc92f8b4140593f209f520c3bba481ecd))
* **dev:** fix type error and tests ([ea2fef4](https://github.com/neherlab/webclades/commit/ea2fef4e889bc61986974670b6c3b1da23dce571))
* remove stray brace ([272a44f](https://github.com/neherlab/webclades/commit/272a44f1c6f9102db05b53ac4dbb80bc390a0ce1))
* remove unused package ([23c8e82](https://github.com/neherlab/webclades/commit/23c8e82c57f1815c74b90125c715d8384d1bfdc0))
* type errors in QC runner ([ab4d34c](https://github.com/neherlab/webclades/commit/ab4d34ca6734042dadc5cdf843365fc92d9cfd8a))


### Features

* add "phylogenetic placement" feature box, adjust main page styling ([45f01fa](https://github.com/neherlab/webclades/commit/45f01fa0b3547b91c9d5bc3fc111f32ab5a34ed4))
* add button to rerun the algorithm ([a4dbcba](https://github.com/neherlab/webclades/commit/a4dbcbac6bbe7ec99055cfc46a4fda4c55816151))
* add intermediate QC level ([46fd02f](https://github.com/neherlab/webclades/commit/46fd02f191d69ecfe1055c22bcf49885d7dc0df6))
* add new QC text to the auspice tree ([641ef02](https://github.com/neherlab/webclades/commit/641ef02c49679815d4ec32743b2b473faa3f403a))
* add reversion mutations to the terminalMutations, rename function ([f2dc7c2](https://github.com/neherlab/webclades/commit/f2dc7c275380f76230d946816728db36f891dbd8))
* adjust exports for new data layout, remove auspice json export ([05a9409](https://github.com/neherlab/webclades/commit/05a940935637c942a09dd298b46e1f025edc5b00))
* adjust progress bar for new algorithms ([1a15c4c](https://github.com/neherlab/webclades/commit/1a15c4cdf8fd30e3ff170b11b371318029d2a0d3))
* adjust progress bar to better reflect recent algorithm changes ([0562dfa](https://github.com/neherlab/webclades/commit/0562dfa899074d9d01818440524164c6925fb04e))
* adjust progress indicator for the new state and event flow ([3f3839b](https://github.com/neherlab/webclades/commit/3f3839b49e8d7c09da6802e854dbae39bec2d2f8))
* adjust results table for the new state and event flow ([3d0c835](https://github.com/neherlab/webclades/commit/3d0c8358f22183412f2cce8e1ad2ceeda1a4f803))
* adjust sorting and filtering for the new QC categories ([7a1d68c](https://github.com/neherlab/webclades/commit/7a1d68c61a8e85072714d3f1eb361266cde5a7fc))
* adjust sorting for the new QC results ([638750d](https://github.com/neherlab/webclades/commit/638750dcb53c19e11e0cb2d867ca834b70e51bd1))
* assign clade from nearest node in reference tree ([d23d5e1](https://github.com/neherlab/webclades/commit/d23d5e1000e4d91be6d83727d89a1e82bd9123dc))
* change privateMutation rule to affine linear excess ([98c71d6](https://github.com/neherlab/webclades/commit/98c71d6452b212755621a21c4f4f19b2094407fb))
* change QC icon labels ([dba62b6](https://github.com/neherlab/webclades/commit/dba62b687e81aa2de37ae4da0e012c5881ae3501))
* combine scores quadratically such that two scores of 70 trigger a warning, or one score of 100 ([c543cee](https://github.com/neherlab/webclades/commit/c543cee6c78d9c4d8164d12bb288119270ce6bf7))
* display status for every QC rule as colored circles ([637a095](https://github.com/neherlab/webclades/commit/637a095bd0f4d3804e2bb3cfbcd689a31e326e4c))
* expose QC config in the UI ([7fc5881](https://github.com/neherlab/webclades/commit/7fc5881a86740c760bc53332c512a7b88b446fa4))
* format QC tooltip based on new results  ([ba412bb](https://github.com/neherlab/webclades/commit/ba412bbaf7f1deac4249cb60bc78c51ab9953699))
* hide passed QC checks from tooltip ([07f92e3](https://github.com/neherlab/webclades/commit/07f92e35bb13b6e84e2e82b26b7507457354c1a9))
* highlight rows with issues ([ba3e2ed](https://github.com/neherlab/webclades/commit/ba3e2edc9c1607dcf04c8c8caefc327315d6c4ff))
* improve QC tooltips, improve layout of large tooltips ([7716b14](https://github.com/neherlab/webclades/commit/7716b149db77ac1b3a9a92030170dbcd6fa50969))
* improve string formatting of insertions ([c0863e2](https://github.com/neherlab/webclades/commit/c0863e2dd1ed767993fa0e4bb90743b405244e43))
* list QC rules in the same order ([1ad2738](https://github.com/neherlab/webclades/commit/1ad2738bde220cd512b88dcaeb677ce7c44f1a85))
* make QC status coloring more consistent ([b17b33f](https://github.com/neherlab/webclades/commit/b17b33f00352a37d057ef3bddeaf017ab5b2a4f0))
* make QC status icons' labels more distinct, single-letter ([4350c28](https://github.com/neherlab/webclades/commit/4350c28aa704f9ef2107fe9df6a5f23935d74ae1))
* pass mutations difference from reference node to QC ([48415c1](https://github.com/neherlab/webclades/commit/48415c1ae995624734485b5c2dab394c15dbdd14))
* prettify QC status circles ([ad61a15](https://github.com/neherlab/webclades/commit/ad61a15845cc36b920f6f0749678bcf6ae280524))
* reduce weight of missing data check ([575aa05](https://github.com/neherlab/webclades/commit/575aa05bd8fbf5a262d6eb6c895786ae702e59aa))
* rename variables to clarify intent ([389dd79](https://github.com/neherlab/webclades/commit/389dd799832ecaf93a9c6b29d56ec9d65079f7ba))
* restyle buttons on results page, adjust for smaller screens ([5a4e806](https://github.com/neherlab/webclades/commit/5a4e80698f7a8420d244658be2e2fc5f5d8eeac9))
* round QC scores in UI ([99aaabe](https://github.com/neherlab/webclades/commit/99aaabeb2245ffd48167b59c6b18fd0a9782ced4))
* show per-rule QC icons in tooltips ([4c45584](https://github.com/neherlab/webclades/commit/4c45584ba3267498b844d6c2d4abc3b261ae2575))
* simplify QC message for mixed sites ([a8228a8](https://github.com/neherlab/webclades/commit/a8228a84a2d84a41c5b8dc5f9bf99f13c5999a8c))
* soften QC status icon colors ([cadae7e](https://github.com/neherlab/webclades/commit/cadae7e67a5e76f6068ea6240f6a4a258fbc8f42))
* use new QC status on tree nodes ([423d459](https://github.com/neherlab/webclades/commit/423d45991b95f035681b700e5c51b68a2d195720))
* **dev:** implement better error handling in algorithm saga ([49c50c2](https://github.com/neherlab/webclades/commit/49c50c2ed21ab5e13c14f2ef81faa8deb388fd1a))
* **dev:** improve runtime performance profiling ([538e82e](https://github.com/neherlab/webclades/commit/538e82e5924057f1e4b3419718add726cc0d586d))
* **dev:** setup runtime performance profiling ([dd12d48](https://github.com/neherlab/webclades/commit/dd12d485d3ac5dd98353de07fa66a9c40082d96f))
* subtract thresholds when calculating QC scores ([7f5013b](https://github.com/neherlab/webclades/commit/7f5013b54069f91f63edd76174ee08be4c15ebef))
* tweak MissingData QC rule to return values such that above 100 is problematic ([8d49eee](https://github.com/neherlab/webclades/commit/8d49eee96e94fa29430f7ae5da90b58a7c968e74))
* tweak parameters of QC rules. remove unused config values ([b78b143](https://github.com/neherlab/webclades/commit/b78b143f7d4b17af3db30cd772a09662474da1b6))


### Performance Improvements

* assign all QC results in bulk to avoid redux performance overhead ([dced28c](https://github.com/neherlab/webclades/commit/dced28c2ae6aeecf4c2f4c2539d3434965d9498c))
* assign clades in bulk to improve performance ([6ce4a2e](https://github.com/neherlab/webclades/commit/6ce4a2e2e0d23b3910b25dcbd59567c58897dbfc))
* make object cloning faster ([6940e9a](https://github.com/neherlab/webclades/commit/6940e9a7abcbc7c9c96578204c35f68d56540f6a))
* memoize a slow function ([92ba87c](https://github.com/neherlab/webclades/commit/92ba87c82907717fa7ef99b9e2887b5449da20f6))
* memoize slowest React components ([4f2969b](https://github.com/neherlab/webclades/commit/4f2969b321bf11fe04c0b25b5db6ad728ce91c5c))


### Reverts

* Revert "refactor: split tree preparation away from tree algorithm" ([2b3df69](https://github.com/neherlab/webclades/commit/2b3df69334c67ba826fc6f204a4a858ff056e78a))



## [0.3.7](https://github.com/neherlab/webclades/compare/0.3.6...0.3.7) (2020-08-28)


### Features

* add export to tsv ([0c4452a](https://github.com/neherlab/webclades/commit/0c4452ac231169b37e42b6439492ce87c3681e78))



## [0.3.6](https://github.com/neherlab/webclades/compare/0.3.5...0.3.6) (2020-08-18)


### Bug Fixes

* lint ([521594b](https://github.com/neherlab/webclades/commit/521594b17df7f2822152d61a7e25f7807bec8d4c))


### Features

* **dev:** visualize functions in redux devtools ([fa8fa54](https://github.com/neherlab/webclades/commit/fa8fa54aea6c163a4d0f7afd433c4ec2117eef00))
* add ability to disable filters temporarily ([a09521c](https://github.com/neherlab/webclades/commit/a09521c7faf966cdff808158266678a6a434df71))
* add auspice entropy widget ([96ad6f6](https://github.com/neherlab/webclades/commit/96ad6f63ac03d89ffb2ba17b02e4dfa1490dc790))
* make sure entropy chart renders properly, adjust page styling ([2eec5c9](https://github.com/neherlab/webclades/commit/2eec5c97d57b7d8fac0341e0e5ddffd4622f0771))



## [0.3.5](https://github.com/neherlab/webclades/compare/0.3.4...0.3.5) (2020-08-08)


### Bug Fixes

* fix type error ([f6cdad5](https://github.com/neherlab/webclades/commit/f6cdad54514fbfc773dfe06daa1b066859191173))



## [0.3.4](https://github.com/neherlab/webclades/compare/0.3.3...0.3.4) (2020-08-07)


### Features

* add node counts for every filter value and badge ([67c7cba](https://github.com/neherlab/webclades/commit/67c7cba9af917a2c3425e3f8599fe1d81f3b01bf))



## [0.3.3](https://github.com/neherlab/webclades/compare/0.3.2...0.3.3) (2020-08-06)


### Bug Fixes

* add missing color value in colorings ([116db0e](https://github.com/neherlab/webclades/commit/116db0e2c62c27638c70098e538aad3ebf8e4abd))
* ensure "Unknown" category is listed first ([67e100c](https://github.com/neherlab/webclades/commit/67e100c6b5c27e322c759af553ca3e231e07835f))
* fix incorrect import ([56e1274](https://github.com/neherlab/webclades/commit/56e1274eeb298660e14a68b46a646abf357dfda2))
* fix type error ([1b07220](https://github.com/neherlab/webclades/commit/1b072209e9212aedc9b6c88e63e8cb108596d012))
* lint ([5c9eab4](https://github.com/neherlab/webclades/commit/5c9eab4b942767b1319cf680ad65170bfbe8622e))
* lint ([1301184](https://github.com/neherlab/webclades/commit/1301184d7d2189e6b1e037c439a6a81a6ba8becb))
* rename variable to clarify the intent ([d318594](https://github.com/neherlab/webclades/commit/d318594d6fdd257fed40c93b602192fc1482dba2))


### Features

* add a foot note about the "Unknown" regions ([1d35ed2](https://github.com/neherlab/webclades/commit/1d35ed2e31ccd4b69a9232b9c4abd671a98e6600))
* add button to clear filters ([d7de823](https://github.com/neherlab/webclades/commit/d7de8232f0683935b7367ad09ee6c621abcc06d5))
* add clade and QC status tree filters ([2ca357c](https://github.com/neherlab/webclades/commit/2ca357c1591a6e2347fc429ca1c38054d99c1cb9))
* add clear button, disable autocomplete and spell check ([7e2c319](https://github.com/neherlab/webclades/commit/7e2c319a02c87892a343892f08cb44e48e5380a9))
* add colorings for "Unknown" regions ([abd366b](https://github.com/neherlab/webclades/commit/abd366b64c649276e50aef2750408333f6658ea7))
* add filtering actions ([3b5aa7b](https://github.com/neherlab/webclades/commit/3b5aa7b3faa262c9c8cb260c1555d0db0791aaa6))
* add node type tree filter ([bb35c35](https://github.com/neherlab/webclades/commit/bb35c35f9c24f87d4f1a0130fb81abf5b04b58a0))
* add region tree filters ([d2a809e](https://github.com/neherlab/webclades/commit/d2a809e7caf68fc6653a8897a9d7b297df107f8c))
* add version number in the main title ([cbb5518](https://github.com/neherlab/webclades/commit/cbb551856e7150250dfcae49056a779cbceff217))
* allow to remove filters by clicking a button on the badge ([6bed38a](https://github.com/neherlab/webclades/commit/6bed38a5bdf7c0141ff5b2e4511133d7b194c70b))
* allow to search for filtering criteria ([61b5a25](https://github.com/neherlab/webclades/commit/61b5a2598312e24388f57a43f490a99def501be1))
* assign new nodes to the "Unknown" region ([a04e0d5](https://github.com/neherlab/webclades/commit/a04e0d5641da977e071dc772c94ba530f522c0cd))
* disable clear filter button when there are no filters to clear ([4fbc5da](https://github.com/neherlab/webclades/commit/4fbc5da60eea7b30e7d8a0fd4d0315057feee062))
* display badges for filtering criteria ([a1b70ed](https://github.com/neherlab/webclades/commit/a1b70ed8a3438cc716fe8a9f023e07eeea6db13f))
* improve sizing and spacing of the filter panel elements ([c682c78](https://github.com/neherlab/webclades/commit/c682c7819bdaf312117559961f6384062093f6fa))
* make filtering badges bigger and brighter ([3cf8f5b](https://github.com/neherlab/webclades/commit/3cf8f5b05d66505d210d31e53f201656747989db))
* make order of filtering criteria consistent ([94ad967](https://github.com/neherlab/webclades/commit/94ad967466a380115cbbc64dd76e6e9730e7d59f))
* match background color with auspice sidebar ([68be816](https://github.com/neherlab/webclades/commit/68be8164c4d1b222fba7226ee9ecb173413b37ff))
* prettify filtering badges ([74f8714](https://github.com/neherlab/webclades/commit/74f871479622e358dc8b561a144685be6ae9958c))
* reduce margin ([4b12a75](https://github.com/neherlab/webclades/commit/4b12a759f799234bdbbe5887d3a74ed1023f464c))
* rename unknown value back to "Unknown " ([e6ce061](https://github.com/neherlab/webclades/commit/e6ce0610939095172ca37e4c63b59fd6fa3a38d7))



## [0.3.1](https://github.com/neherlab/webclades/compare/0.3.0...0.3.1) (2020-07-30)


### Bug Fixes

* add missing env vars for vercel ([62eaa01](https://github.com/neherlab/webclades/commit/62eaa014e5c63529768fabe8d524fa2d987a3d98))
* automate auspice monkey-patching ([d27a9c5](https://github.com/neherlab/webclades/commit/d27a9c56d12ce28b8a7c997d4f3cfac801ee2dab))
* avoid incorrect absolute imports ([66dcb4d](https://github.com/neherlab/webclades/commit/66dcb4d40c0209e50f35c357c44362fbe23c2f18))
* avoid redux error about non-existing `query` auspice reducer ([d6c141f](https://github.com/neherlab/webclades/commit/d6c141f0a8db663b197ab859dd317b6abe60fc0f))
* disable debug console messages for i18next ([56baa17](https://github.com/neherlab/webclades/commit/56baa174410e2670238c591039548a56347f6e27))
* don't call clade match if position isn't covered by the alignment ([045984f](https://github.com/neherlab/webclades/commit/045984f4ffc1aaf194819bd5c9d5c618112fd9b7))
* ensure absolute URLs in the SEO tags  ([88c1615](https://github.com/neherlab/webclades/commit/88c161548bdf4a04c2e6b2b58d4500fb1286ec30))
* ensure auspice tooltips are not empty ([c3f0ab3](https://github.com/neherlab/webclades/commit/c3f0ab33f705995703328c07fd3bae5b4d70e8bb))
* ensure translations are loaded properly ([7bca9de](https://github.com/neherlab/webclades/commit/7bca9dec2c9aacf3fc2a0439d5a0d2089c54d248))
* ensure vercel url has https schema ([462a76f](https://github.com/neherlab/webclades/commit/462a76f8fac21b56ccd4e807199a7606a4588cc5))
* ensure vercel url has https schema ([f1462f6](https://github.com/neherlab/webclades/commit/f1462f685c66c4cbfaf21ddef764c4aa887d4ab8))
* ensure zero positions don't trigger errors ([fda012e](https://github.com/neherlab/webclades/commit/fda012e60aabea2b12a6056ddfd4058ca4d63bf5))
* fix incorrect seo tag name ([8059e39](https://github.com/neherlab/webclades/commit/8059e392b143ebc06ad92eb5b5b231399cdb966b))
* fix object merging ([50e1761](https://github.com/neherlab/webclades/commit/50e17618709f75568f4e34dd889b6d29eb145e92))
* format ([638ee3a](https://github.com/neherlab/webclades/commit/638ee3a450afdb07944cbf55a2bc5af015828488))
* implement babel caller check as described in docs ([2cc4e5a](https://github.com/neherlab/webclades/commit/2cc4e5a9989e567087cf4c073190cc3fb6f13ca4))
* lint ([a04cb05](https://github.com/neherlab/webclades/commit/a04cb058618be14bde4485697c4c1a19c9627d00))
* lint ([25393fa](https://github.com/neherlab/webclades/commit/25393fa54e6ccb4e37d87b9c9485b528efe5c55b))
* lint ([640a6d5](https://github.com/neherlab/webclades/commit/640a6d595e9410d7831d8b57999001ef13c3a36f))
* lint ([074d4ed](https://github.com/neherlab/webclades/commit/074d4ed5a81b343f954a597a727fccc397788643))
* lint, fix type errors, cleanup ([e9ac5a0](https://github.com/neherlab/webclades/commit/e9ac5a02c00e6463e69079e0dd2a0732dda8079f))
* make parser robust to various line delimiters and unexpected characters ([7c000b2](https://github.com/neherlab/webclades/commit/7c000b2e89ba601553bded3021b8a5f131c72d24))
* make sure locateInTree() is reentrant ([3bd0698](https://github.com/neherlab/webclades/commit/3bd0698da9fa7a472614ea1bb40d58cb2f1f511e))
* patch auspice to remove more references to window ([8a50144](https://github.com/neherlab/webclades/commit/8a501440b10d7d31cdc06f44a19547c487b568fd))
* remove erroneous env var ([8541468](https://github.com/neherlab/webclades/commit/854146885f59c9fa1ebcaf872d04a41495089d5f))
* remove spaces in env files ([7d79926](https://github.com/neherlab/webclades/commit/7d799269f02fb7ee3487baba87dd3a639795dde8))
* remove unsupported syntax from babel config ([7fdb15f](https://github.com/neherlab/webclades/commit/7fdb15fbc6a63af02cc008704f457e92986ea03f))
* show sequences being analyzed again ([04b501c](https://github.com/neherlab/webclades/commit/04b501cd698af07b8e9ab597bb587436c54bf108))


### Features

* add "powered by auspice" logo on tree page ([294a2c2](https://github.com/neherlab/webclades/commit/294a2c22ef8f8f5d5b914ba7c1b7b8259c494b8f))
* add auspice reducers ([6482351](https://github.com/neherlab/webclades/commit/6482351452d9d736fee06f9504d6cc1e44f7bec6))
* add auspice sidebar ([71e1f56](https://github.com/neherlab/webclades/commit/71e1f5624b8a25394eb7cda3051b7a1e94ccc8b5))
* add button to show auspice tree ([234f5e5](https://github.com/neherlab/webclades/commit/234f5e5cfb2e7152878df6cbdc3f07dd25098a22))
* add google meta tags ([7cf4f63](https://github.com/neherlab/webclades/commit/7cf4f638834bc13e52d4a35eb91c964a1f6b7257))
* add help tips for results table column ([0257e44](https://github.com/neherlab/webclades/commit/0257e4469bedb75f65996e247219ed4fb3c522d3))
* add more data to tree node popup ([0e69173](https://github.com/neherlab/webclades/commit/0e69173cfb7b1843d513606b0682c299ee761018))
* add more meta tags for og and twitter ([0dc4f43](https://github.com/neherlab/webclades/commit/0dc4f4357a0c7feb5dcb1d97f588e9209b7bea04))
* add padding for top panel ([94b9d60](https://github.com/neherlab/webclades/commit/94b9d604ae7a13ac5dc51a0cd186fbc472b08b3c))
* add QC flags to the tree node popups ([5aed898](https://github.com/neherlab/webclades/commit/5aed8985a516f4ac09da462563124a4684fdb642))
* add redux thunk ([b74a1a2](https://github.com/neherlab/webclades/commit/b74a1a2f6b5fb4c38e09729a9c4b7868171a04bf))
* add redux-logger ([c2d7992](https://github.com/neherlab/webclades/commit/c2d7992cd685627c9ff1020cae4a28c01ac2c1d1))
* add styled-components theme ([8d29882](https://github.com/neherlab/webclades/commit/8d2988216939a8fb3d487152872c97132ad2af05))
* add styled-components theme from auspice ([5ec57d1](https://github.com/neherlab/webclades/commit/5ec57d184fac84ff0fc35e55bc365b3a63d6b206))
* add twitter and facebook meta tags ([f5fca2a](https://github.com/neherlab/webclades/commit/f5fca2a0022a6e7dfbc75948c308c9b8b8a267fe))
* adjust legend's margin ([f71cc7b](https://github.com/neherlab/webclades/commit/f71cc7b6a4a5fff11b6da8652b2087b4aba0c38f))
* allow loading fake auspice state for development ([72733ad](https://github.com/neherlab/webclades/commit/72733adb1d8f0bc8e38534f07ee6c6c6db45cab7))
* attach new nodes to reference nodes only ([6dc7321](https://github.com/neherlab/webclades/commit/6dc7321ebb33e62284c4b9fb51b8df360c551fe7))
* autosize the tree ([2e1aad5](https://github.com/neherlab/webclades/commit/2e1aad5faa24ecbbc27c7ec50def4ab792f86bad))
* color tree nodes explicitly by QC status and type ([5a1f976](https://github.com/neherlab/webclades/commit/5a1f97659041d2efbf23cda5979eb0e6a58ede51))
* disable tree button until the analysis is done ([b09492e](https://github.com/neherlab/webclades/commit/b09492ee0dcf2c1819f7ade6637527c73ced7f25))
* display aminoacid mutations in auspice tree ([811ea79](https://github.com/neherlab/webclades/commit/811ea79d127342a4d9ffe1ed0e0325465922f237))
* import and build auspice as a part of webpack build ([9d75bae](https://github.com/neherlab/webclades/commit/9d75bae470b3322072dfcc05969ec048d54d19bd))
* improve visibility of nodes in QC coloring ([3ecd30f](https://github.com/neherlab/webclades/commit/3ecd30f37d1f2c9eaee9474fe7d197bcbd17bb0f))
* improve webmanifest ([3a6045e](https://github.com/neherlab/webclades/commit/3a6045e0a31b9360355a023de85dbfe0206429e5))
* include auspice translation bundles ([03791e8](https://github.com/neherlab/webclades/commit/03791e8c2d4bfb05d03288f77bb8a3e368954e4b))
* integrate auspice json generation into UI ([17d920c](https://github.com/neherlab/webclades/commit/17d920c48974a82dc0178a64fd0464626d554eb8))
* make closes nodes brighter, shorten node type text ([4deb988](https://github.com/neherlab/webclades/commit/4deb98802553c6f41c987743831d9febb22df13f))
* make help buttons larger ([504a63a](https://github.com/neherlab/webclades/commit/504a63aa6986edf0c4a29a030245c44c5a75ff49))
* make tree button more visible ([4f51b2a](https://github.com/neherlab/webclades/commit/4f51b2a33bf32a3acb824d2a46ed635e35cd7678))
* mark constants `as const` ([6ead3e5](https://github.com/neherlab/webclades/commit/6ead3e5af90d9d1d31faf59e465804ff4e2a5e00))
* move SEO tags into separate component, use react-helmet ([b220e97](https://github.com/neherlab/webclades/commit/b220e97c1a3f543eea228b63858117dc0bcbd07e))
* move some of the SEO tags to _document, for static rendering ([a35c820](https://github.com/neherlab/webclades/commit/a35c8209271b26ebb42d46c46b840f90161f0072))
* pass domain name to the client side ([9624955](https://github.com/neherlab/webclades/commit/96249556644ab103e90ed1b57ad378a3f5cbc0a4))
* port locate_in_tree.py to typescript ([7c6c164](https://github.com/neherlab/webclades/commit/7c6c16453b6b8afbf9e4f391525fe97c861873a7))
* prerender styled-components stylesheets ([d88a9cf](https://github.com/neherlab/webclades/commit/d88a9cf638702645477ac783b74766e921909a6c))
* prettify tree page ([e5a241e](https://github.com/neherlab/webclades/commit/e5a241efe3c7fb43e9777d4db481c4d1120e8682))
* prettify tree page and related components ([e8a15d9](https://github.com/neherlab/webclades/commit/e8a15d988105f7dba3167d20728bd636a3392eda))
* put custom coloring at the top of the dropdown list ([c1ed74b](https://github.com/neherlab/webclades/commit/c1ed74b206e1d314a160074153b56f2697e50627))
* reduce sidebar top spacing ([94fc062](https://github.com/neherlab/webclades/commit/94fc062a31359bd8fcf186da08e2fe621358222d))
* remove coloring of closest nodes on the tree ([fa5424e](https://github.com/neherlab/webclades/commit/fa5424e62107668ca3360c9aca3e2968db5a8db9))
* remove unused date and dataset choice widgets from auspice sidebar ([3235278](https://github.com/neherlab/webclades/commit/323527818277366674dc947bc2c61599d9ec17d0))
* remove unused getInitialProps to allow static prerendering ([df30618](https://github.com/neherlab/webclades/commit/df30618fc6efcd71a9edbc4259cb524d86195011))
* render auspice tree ([fb2513f](https://github.com/neherlab/webclades/commit/fb2513f0472ff55348c7cff3ad8bdc599ddce432))
* use nexstrain logo spinner for loading page ([db21817](https://github.com/neherlab/webclades/commit/db21817bbd8da31f1eac014f2d96e8f945524a1b))



## [0.2.2](https://github.com/neherlab/webclades/compare/0.2.1...0.2.2) (2020-07-17)


### Bug Fixes

* remove console warning  ([23850fe](https://github.com/neherlab/webclades/commit/23850feb45f30b8c00355b0141dd6b6a2d5e7d51))



## [0.2.1](https://github.com/neherlab/webclades/compare/0.2.0...0.2.1) (2020-07-17)


### Bug Fixes

* adjust styling for breaking changes in react-file-icon v3 ([902f045](https://github.com/neherlab/webclades/commit/902f0451fa20c347bd340ffeef3cc5e86ba50adc))
* bring back regenerator-runtime in workers ([eec18b2](https://github.com/neherlab/webclades/commit/eec18b2997d64855db6f8b19b846c59adf4e0733))
* ensure filtered results are updated when results are updated ([39d6601](https://github.com/neherlab/webclades/commit/39d660197454cb77d4e7f4089b7eed84ed1656b7))
* fix negative width in  svg viewbox ([b32a4f6](https://github.com/neherlab/webclades/commit/b32a4f6c5c670ed61e9795f81ac407e19753e57a))
* format ([9727f63](https://github.com/neherlab/webclades/commit/9727f63ae1a263b468e2efb5b3e31a4e6c908a5b))
* hide filtering panel by default ([0991119](https://github.com/neherlab/webclades/commit/0991119fdbbe0f5420a68f24f8cce96c542d1cc6))
* lint ([5f0c2a1](https://github.com/neherlab/webclades/commit/5f0c2a1a4f6d3afd685d07c1d39f6a676ab21a3d))
* lint ([d9e8707](https://github.com/neherlab/webclades/commit/d9e87076cca1fc52b185dc7e22bb486d42d6bad0))
* lint ([fa6242a](https://github.com/neherlab/webclades/commit/fa6242af17f666b9ca1932e9c690ca32d18b6f17))
* lint ([28020ea](https://github.com/neherlab/webclades/commit/28020eaaf40d947f676c8b21cebd44e3b697f97e))
* make parser robust to various line delimiters and unexpected characters ([afbcfd6](https://github.com/neherlab/webclades/commit/afbcfd6bf740db1502af3b17b440e64ff0ccc9a6))
* make sure gene map tooltip appears reliably ([19ec421](https://github.com/neherlab/webclades/commit/19ec421d6c46a917623204596678b192006dc3e2))
* make sure the icon in dev alert is not overlapped by text ([5755956](https://github.com/neherlab/webclades/commit/57559568d62ddd118edba2ab2c437fbe377b1dd6))
* only match the last clade in the array of clades when filtering ([0a3c0ad](https://github.com/neherlab/webclades/commit/0a3c0ad82d8dad238e2f7a4a372d22bc5a6b13c0))
* packages/web/package.json & packages/web/yarn.lock to reduce vulnerabilities ([17c1e2b](https://github.com/neherlab/webclades/commit/17c1e2b2508e1aeaec257c80ff2d0577ff1410ed))
* prevent sequence text from wrapping ([1117cf3](https://github.com/neherlab/webclades/commit/1117cf34374fdf764fde9040b12efdcabb26489f))
* prevent vertical scrolling of navbar ([32fb39d](https://github.com/neherlab/webclades/commit/32fb39d9fcf6718ba1bac7456e013c95535a344f))
* remove unnecessary core-js import from workers ([bd9ec93](https://github.com/neherlab/webclades/commit/bd9ec935afbe4ffed483ab59f2c48765674c2085))
* reverse sort order ([75fd269](https://github.com/neherlab/webclades/commit/75fd269b55974452e4e73f24e38d11f38f88caf8))
* sort only sequences that makes sense to sort ([ccd6daf](https://github.com/neherlab/webclades/commit/ccd6daf41c1d8d469736a4f07f604e757a6a9101))
* typos ([fc80cc2](https://github.com/neherlab/webclades/commit/fc80cc2dced3a19d4e64ab43b483db3a5eae6d0d))


### Features

* add basic virtualization to the table ([b2e2d11](https://github.com/neherlab/webclades/commit/b2e2d114c8ec36ffe8a7ff0e1cb894da6aa99cb4))
* add filter dialog popups ([124ffe3](https://github.com/neherlab/webclades/commit/124ffe3d0955f8e6692afc2e65a0a1db59b40363))
* add filtering  by presence of QC issues and errors ([712de18](https://github.com/neherlab/webclades/commit/712de18903a100281ba79ff93c4d4cb2219815fd))
* add filtering by aminoacid changes - gene, ref, position, query ([77bbedf](https://github.com/neherlab/webclades/commit/77bbedf6c2f6d708fd98bdd514df068ab218652a))
* add filtering by aminoacid mutations ([3b7759f](https://github.com/neherlab/webclades/commit/3b7759f78ed1eda8906046c335a9b13ebabe922a))
* add filtering by clade ([6ee0b3b](https://github.com/neherlab/webclades/commit/6ee0b3bbd8741818a1613ee1712966f7519e9676))
* add filtering by nucleotide mutations ([98f2d4b](https://github.com/neherlab/webclades/commit/98f2d4b2676b92a180f8ce24d3a302ee932eccbe))
* add filtering by sequence name ([62cc172](https://github.com/neherlab/webclades/commit/62cc172b092e709f4bd35e44c1c9d87e7bc9d94c))
* add flexbox fixes for internet explorer ([e604b04](https://github.com/neherlab/webclades/commit/e604b0449faf3c0e8bcb16326d1f7669d4a6d88a))
* add id column to results table ([ea0994c](https://github.com/neherlab/webclades/commit/ea0994c9819140001c2b3dc8d91902da1ed82959))
* add logos ([f25e511](https://github.com/neherlab/webclades/commit/f25e511e6976350fecd7830b8637da21ee89d3ae))
* add more mutation syntax options ([937ac73](https://github.com/neherlab/webclades/commit/937ac73c7aa84717595ff8bab87942b7681db097))
* add mutation parser ([8e88955](https://github.com/neherlab/webclades/commit/8e88955b6a83d7e58c9b22d500e9be8d19ce715d))
* add polyfils ([add5dd6](https://github.com/neherlab/webclades/commit/add5dd61aca9510fc52286e79dad2a755e3a20bd))
* add sort by sequence name ([6f8721c](https://github.com/neherlab/webclades/commit/6f8721c4989b44d57714c7ceea470d8d078d7a25))
* add sorting for all categories ([5a2efc5](https://github.com/neherlab/webclades/commit/5a2efc5f18849181de5a184947d3e906ef3f5e22))
* add table border ([2e796ab](https://github.com/neherlab/webclades/commit/2e796abd1609018ec39e3d13456a784ede32c8c5))
* add table border and shadow for when rows don't fill the area ([73e092e](https://github.com/neherlab/webclades/commit/73e092e79dffb2da0bf1d03f65bb8f2c476ae1da))
* add transpiled modules whitelist ([115cdb1](https://github.com/neherlab/webclades/commit/115cdb1273e2041bab75248c6ddf58bbb5a91f77))
* adjust filter button style - layout, position, margins ([fa09ed5](https://github.com/neherlab/webclades/commit/fa09ed5cba4940812f0fe74792fd888bb2f19239))
* adjust gene map width ([4db941b](https://github.com/neherlab/webclades/commit/4db941b8bba9be3b9268765d4f2b65d070f73f57))
* adjust sort and filter buttons sizes and positions ([39f4e19](https://github.com/neherlab/webclades/commit/39f4e19225a90b45b91fc1f3f5d43cb8b4471ec9))
* adjust table column widths to accommodate filter and sort buttons ([85551b9](https://github.com/neherlab/webclades/commit/85551b9f90a8b6fe54efd4465aa8c76975e4581d))
* avoid main title text overflow ([99b621b](https://github.com/neherlab/webclades/commit/99b621bbd8ecbc00b0706356f6a0197869e569af))
* bring back the genome map ([0513fa6](https://github.com/neherlab/webclades/commit/0513fa65ec3a971dfdfaf7cd7ff79b5ea8b1b1a8))
* bring back the genome map axis ([fdeedfb](https://github.com/neherlab/webclades/commit/fdeedfb897774ba54cd70663bf23f27959f6877f))
* bring back the old layout for the main page ([756d496](https://github.com/neherlab/webclades/commit/756d49658e616014b4527f82fc725d7140c59c46))
* bring back the results status panel ([a92114d](https://github.com/neherlab/webclades/commit/a92114d411e441294af8604eacc769d64df3aa70))
* constrain main page container width ([727aad0](https://github.com/neherlab/webclades/commit/727aad05e5c4760859686e792a0ab0cc32c655dc))
* don't go to /results page ([2225bb4](https://github.com/neherlab/webclades/commit/2225bb492772241b31b38edfb7922584085268ac))
* enforce horizontal scrolling on results page if the screen is to narrow ([3e2e409](https://github.com/neherlab/webclades/commit/3e2e409ab4e72480de2d8f46a12e5cacf597226d))
* ensure columns are of correct and equal width, prettify ([e169137](https://github.com/neherlab/webclades/commit/e169137316d0970c23a3580c36eb274baf5a49ef))
* increase sequence name column width ([a99e15b](https://github.com/neherlab/webclades/commit/a99e15ba1d55718f66a2a18aa11693261f3a764b))
* increase sequence name column width to 300px ([f8b53eb](https://github.com/neherlab/webclades/commit/f8b53ebd69bd91074e84058676725083cb8caa8d))
* make feature boxes responsive ([8780343](https://github.com/neherlab/webclades/commit/87803435dbc3dda24148d7ea970ab699fbe4385d))
* make filter panel collapsible, prettify its contents ([d6714c2](https://github.com/neherlab/webclades/commit/d6714c28ce55e265dff9cfcf12ecea894968adf2))
* make footer prettier ([ae8a4d8](https://github.com/neherlab/webclades/commit/ae8a4d8a79cd98498c9414fe7fb4556a91b683a0))
* make footer responsive ([c1644b9](https://github.com/neherlab/webclades/commit/c1644b9fa8f30de8cef05e7a0ed2e56bb1b9ee4b))
* make pending rows dimmer and of the same color ([fbcfcac](https://github.com/neherlab/webclades/commit/fbcfcac9041e59f5d2cef4fb221a4916b225e31f))
* polyfill CSS.escape for internet explorer ([c120f8a](https://github.com/neherlab/webclades/commit/c120f8af098fe5ff318236b3237f34e0d3226404))
* prettify filter panel ([b40dcf0](https://github.com/neherlab/webclades/commit/b40dcf0ba89348b641b7785033c23f08cd9e9e0e))
* reduce margins, text sizes on small screens, prevent overflow ([160459c](https://github.com/neherlab/webclades/commit/160459c308dd9f7d219837b5e2567a95bbfb9e86))
* reduce minimal width to fit on iPad, adjust padding ([e7b666a](https://github.com/neherlab/webclades/commit/e7b666a4c46530073287e1c089fca95539a0ecbb))
* remove filter buttons in column headers ([1d21fa3](https://github.com/neherlab/webclades/commit/1d21fa34f503c9fa9942220bc10abc34452bcb05))
* sort errored sequences as the ones with the worst QC result ([90599d2](https://github.com/neherlab/webclades/commit/90599d26feb04e69ffc0638dcca649f5921d4d99))
* trim filter strings, allow more delimiters ([26182d1](https://github.com/neherlab/webclades/commit/26182d12aacce37aff5e9ccbe2bfbea7f7b89c80))
* **dev:** add flag to allow setting fake data and navigating to results page ([b618735](https://github.com/neherlab/webclades/commit/b6187354e5e1b8acfa1e01d30b0b2efce7919562))



## [0.1.2](https://github.com/neherlab/webclades/compare/0.1.1...0.1.2) (2020-07-03)


### Bug Fixes

* avoid crash in export when there are failing sequences ([6e65d77](https://github.com/neherlab/webclades/commit/6e65d7793ecceeb0260e697576942952b6696d1b))
* enable export button even if some of the sequences fail ([dd60ed9](https://github.com/neherlab/webclades/commit/dd60ed94139af05106f815570d5836cac3f1cc50))
* lint ([90dbbb7](https://github.com/neherlab/webclades/commit/90dbbb74da2cbc0eda106e622eeef9c7d7218f4d))
* remove fake entries ([145b61a](https://github.com/neherlab/webclades/commit/145b61aa440daac20424cdca71551c19303ff489))


### Features

* add basic analysis failure reporting ([27736ba](https://github.com/neherlab/webclades/commit/27736ba4aadf6767ee6d93cae0d48d1bcbd6b4d3))



## [0.1.1](https://github.com/neherlab/webclades/compare/fec09428c477538d9b721a896c9f89172633f693...0.1.1) (2020-07-02)


### Bug Fixes

* add missing hook dependency ([1f0de52](https://github.com/neherlab/webclades/commit/1f0de52ae7afd49d2d0a452a13841013a86f671f))
* allow indexing of the website ([92e10c9](https://github.com/neherlab/webclades/commit/92e10c977b54c5b3147f38bef5d8d3b1e8ac7fd6))
* apply eslint autofixes ([488cae3](https://github.com/neherlab/webclades/commit/488cae3351da526ecb62d5fd307242d10688ab6d))
* avoid html validation errors ([d5627b2](https://github.com/neherlab/webclades/commit/d5627b23281308a5ba9cc64fe57ed97787f95631))
* break dependency cycles ([4700de2](https://github.com/neherlab/webclades/commit/4700de221426c4efdb25da52d278474c0ece8f69))
* clarify that the tooltip currently shows all the clades ([ac12ea6](https://github.com/neherlab/webclades/commit/ac12ea66057c09131fddf1cba6eaa7921a078c49))
* display positions as 1-based ([4940513](https://github.com/neherlab/webclades/commit/494051378f7351f61408cca00635d7e63474c196))
* display positions as 1-based for real ([bc31c28](https://github.com/neherlab/webclades/commit/bc31c28e62e87d1cb7db7bda4d30d970e3920dcd))
* don't shift svg rectangles by half-width ([481359b](https://github.com/neherlab/webclades/commit/481359bdf66e89aa1367aa8060b313ba9c3953f8))
* ensure aminoacid changes are shown correctly ([79453b8](https://github.com/neherlab/webclades/commit/79453b881412a762360072e27d4ef1f0535b2b8e))
* ensure isSequenceInClade is typed ([3fe6fcb](https://github.com/neherlab/webclades/commit/3fe6fcbc8d18edc11004ecb0da826b9c89dd1bc0))
* ensure type checks can be enabled ([0644baf](https://github.com/neherlab/webclades/commit/0644bafeb3adc1dda3f881a9bdccef7364a30db2))
* ensure typing of raw imports ([499a5d7](https://github.com/neherlab/webclades/commit/499a5d747d029b11ccf70acc2ab1823495edeef8))
* fix deepscan issues ([ebaa8f6](https://github.com/neherlab/webclades/commit/ebaa8f68dfa90e6cf05e5d21fcb03422febaee3c))
* fix guard condition in aminoAcidChange() ([1d9df44](https://github.com/neherlab/webclades/commit/1d9df44a2a6c8b08f02a49e10cb36194d6a0d394))
* fix guard condition in aminoAcidChange() ([978a9f6](https://github.com/neherlab/webclades/commit/978a9f6a6f05b63c9e383b46185a9634a27f4947))
* fix implicit use of React ([465a082](https://github.com/neherlab/webclades/commit/465a0821d0476894bfe6430bcf9d230719d17cb5))
* fix imports ([f5af2aa](https://github.com/neherlab/webclades/commit/f5af2aa903bce4dba2df91941375463cefff031c))
* fix lint and type errors ([8a9d7a3](https://github.com/neherlab/webclades/commit/8a9d7a38af6b3a61721245c75559b3e7278e13ca))
* fix tests for nucleotide range retrieval ([4991506](https://github.com/neherlab/webclades/commit/49915066484ebc1fbaef9ca1e9d436193b93e3ec))
* fix type mismatch ([4fe0a1a](https://github.com/neherlab/webclades/commit/4fe0a1ad03d66fa5b4294d18b9dcbf6462e282c5))
* fix typings ([f780257](https://github.com/neherlab/webclades/commit/f780257fa8307176a764a73dfd274b811c5c0c5d))
* grammar ([1d948c1](https://github.com/neherlab/webclades/commit/1d948c1693d36bdd1094ea241f7c70afaf7d18d8))
* improve button styles ([532c93e](https://github.com/neherlab/webclades/commit/532c93ef4315e80cfb58cd52e709963642219773))
* improve translations ([95cf881](https://github.com/neherlab/webclades/commit/95cf881f2f0362fdca4b88f2bf0cb0d8743fa0c1))
* lint ([8d85353](https://github.com/neherlab/webclades/commit/8d8535367985e11c86a6191cfee937dd458b5632))
* lint ([be874ae](https://github.com/neherlab/webclades/commit/be874aeaebb6cdfbb76bdcceaee4ad0e1f063e55))
* lint ([af82d9f](https://github.com/neherlab/webclades/commit/af82d9f64277411197bf8b65c390e44f00e89323))
* lint ([c36c6a9](https://github.com/neherlab/webclades/commit/c36c6a9bbff4ce0ad5f18c8d2f854c05f3cd4569))
* lint ([da9c98d](https://github.com/neherlab/webclades/commit/da9c98df353e8bf8c081450fe9555a530f402ce8))
* lint ([4eb882c](https://github.com/neherlab/webclades/commit/4eb882c1c3596673b9790bdd4fe08ddb1cdae404))
* lint ([6567a4b](https://github.com/neherlab/webclades/commit/6567a4b1f48e5c174476d391d197f435dddb178f))
* lint ([0eaa7c9](https://github.com/neherlab/webclades/commit/0eaa7c9b8248b94ac8379c36f0012fa8fbe2a090))
* lint ([c79c2ca](https://github.com/neherlab/webclades/commit/c79c2caf7b1689a2d909a7105539958529a36c3e))
* lint ([f95d453](https://github.com/neherlab/webclades/commit/f95d453fd477ff2f1dbec2558937f3280da62881))
* lint errors ([6309298](https://github.com/neherlab/webclades/commit/630929821c093dcbe8cf6d7fe19a36eee3e40929))
* lint errors ([cbf9215](https://github.com/neherlab/webclades/commit/cbf921594697c217ed32421567e525ab8f11b23e))
* lint errors ([404bbf7](https://github.com/neherlab/webclades/commit/404bbf72279a2e8298b56ba89ae8210d59896bfa))
* lint errors ([add6b26](https://github.com/neherlab/webclades/commit/add6b266b88504504573a18fb138585e08f84c32))
* lint errors ([9047a0a](https://github.com/neherlab/webclades/commit/9047a0aebfc0e203a2f99a1b4888851259631f7c))
* make "back" button to actually go back, not to a specific page ([9cd3c91](https://github.com/neherlab/webclades/commit/9cd3c917bca3888943b9913f1a14ae7239b19736))
* make sure "dirty" flag is set properly ([4f4024d](https://github.com/neherlab/webclades/commit/4f4024d0f9a068f4526e2e1f07633db40d2db268))
* make sure "to results" button shows up ([05b77d0](https://github.com/neherlab/webclades/commit/05b77d0dc013a7daf1ee5108db765ca9d251f4bb))
* make sure settings saga is being run ([28095a8](https://github.com/neherlab/webclades/commit/28095a8c917e50243d8c6f5867e73b9ae0b67bd6))
* packages/web/package.json, packages/web/yarn.lock & packages/web/.snyk to reduce vulnerabilities ([73555b8](https://github.com/neherlab/webclades/commit/73555b89675d90a069dd95cf5275f4fc04f90411))
* packages/web/package.json, packages/web/yarn.lock & packages/web/.snyk to reduce vulnerabilities ([d1ab37a](https://github.com/neherlab/webclades/commit/d1ab37a03236572cd412fef1576abda6826a25af))
* remove aligned query from results ([0a3f999](https://github.com/neherlab/webclades/commit/0a3f9995672dc08fa5eab2aed0c3d9ad3d443bcc))
* remove redundant table borders ([25c016d](https://github.com/neherlab/webclades/commit/25c016d394188e7a6dcc6e0f6a00bc8057bacc06))
* remove unused and vulnerable packages ([9214419](https://github.com/neherlab/webclades/commit/9214419274e84bdc6d515c7a8fec09267ae2bf9b))
* rename file to clarify intent ([2b6a213](https://github.com/neherlab/webclades/commit/2b6a213fc6d610fa48045cfe2360178ace8714a3))
* resolve Threads.js workers bundling error in production  ([bd775a8](https://github.com/neherlab/webclades/commit/bd775a800eab871780d5a5a93b5385b2d99bf56b))
* silence eslint rule that produces false positives in typescript ([c3b0e48](https://github.com/neherlab/webclades/commit/c3b0e4813823b18d5115948f278db9ded39b0d5f))
* silence more new eslint rules that produce false positives in typescript ([a76cf14](https://github.com/neherlab/webclades/commit/a76cf1486cfe2f603f956443e347a1a0baed8701))
* soften border color ([763e227](https://github.com/neherlab/webclades/commit/763e2270a235618a96785e59351188561d90d2db))
* trim whitespace and line ending characters from reference sequence ([86cd548](https://github.com/neherlab/webclades/commit/86cd5487b39377fe8aa99dc438e6aa455a5bca0b))
* type and refactor getAllAminoAcidChanges ([1e95f2f](https://github.com/neherlab/webclades/commit/1e95f2f97440e1239fd5af43f379ce4046ee2ea2))
* type errors ([92486a7](https://github.com/neherlab/webclades/commit/92486a709ca55a3ae240cf4e19a3daf716f279c9))
* type errors in saga ([fefdace](https://github.com/neherlab/webclades/commit/fefdace146d0a56ce6d3d237d34b6ff8cfbe48e0))
* **dev:** disable eslint cache for consistent results, disable checker profiling ([3f9962e](https://github.com/neherlab/webclades/commit/3f9962e5eca94c49e7ee775348c18b82dba23f26))
* **dev:** ensure webpack watches the typings ([f0a667d](https://github.com/neherlab/webclades/commit/f0a667d2a678538e70fa40895ccbd2b65893af81))
* **dev:** make sure type checking can be disabled ([5f4918b](https://github.com/neherlab/webclades/commit/5f4918bbafde19c2f8273ce5d2cef03130b20091))


### Features

* add "to results" buttons on main page, prettify "back" button ([887ca23](https://github.com/neherlab/webclades/commit/887ca239bb5ab7a9a6365fc033eb63dfd91f9c4e))
* add aminoacid changes to sequence name tooltip ([4b7b232](https://github.com/neherlab/webclades/commit/4b7b232ccce63ccad9cbfcb9c4a622e680c64c39))
* add aminoacid mutations to mutation tooltips ([5643863](https://github.com/neherlab/webclades/commit/56438630ffff3e6855096f96d279f15d33a0b08c))
* add back and settings buttons ([ff6f359](https://github.com/neherlab/webclades/commit/ff6f35985c4b88a0bf7c6136693a8ee8da335ee2))
* add basic progress indicator ([1ac9736](https://github.com/neherlab/webclades/commit/1ac9736573068593a9d6d9be8b522a596fa6a3a0))
* add basic SEO tags ([5e597df](https://github.com/neherlab/webclades/commit/5e597dfe8ba9838c5ddeb586cf1f27bdbe31fef4))
* add basic sequence visualization ([d2bd0cb](https://github.com/neherlab/webclades/commit/d2bd0cbd1535699bf868966e2a0e51f6df35c41a))
* add beta badge ([97bcf43](https://github.com/neherlab/webclades/commit/97bcf43ad4d70541f9acacc935bc7cc18baf5d36))
* add clade info to the tooltips ([5588cd1](https://github.com/neherlab/webclades/commit/5588cd17cc600ccb58dcc5172bc5224ab9821534))
* add clade marks to gene map ([b197d3b](https://github.com/neherlab/webclades/commit/b197d3b920fd7d999fb88c4c3681c2a4dc3f0071))
* add csv export ([59247dc](https://github.com/neherlab/webclades/commit/59247dc029f8d476a0e2ae24689bd879e59ae41d))
* add exports to both JSON and CSV using dropdown button ([47e8570](https://github.com/neherlab/webclades/commit/47e85702d5695950ebfff4d3b5befd5ecfd8cc80))
* add favicons ([0ff52c7](https://github.com/neherlab/webclades/commit/0ff52c77889227c40dacf0021a55539029719663))
* add footer branding ([4ae2d37](https://github.com/neherlab/webclades/commit/4ae2d37905dc7312d4fee98c405619e7290c71e9))
* add French to language selector ([04c7f4c](https://github.com/neherlab/webclades/commit/04c7f4cde17916007aa002c49aa860e27bde5cac))
* add gene map ([e938c68](https://github.com/neherlab/webclades/commit/e938c687c5f4b76602ee9c993690dd405011ba8a))
* add list of non-ATTGCN to tooltips ([bbe2a61](https://github.com/neherlab/webclades/commit/bbe2a61343f996b1c06adb25866d4497ede7cee6))
* add more languages ([15dd09c](https://github.com/neherlab/webclades/commit/15dd09c5edb1e085ac2d94014468e876719e34ec))
* add mutation tooltips ([f2bfc64](https://github.com/neherlab/webclades/commit/f2bfc647ed8618ad6440db7230dd7e6422ccd53b))
* add navigation bar, routing and about page ([7bc2fff](https://github.com/neherlab/webclades/commit/7bc2fff953043650bfa776da3ed5bb9053cbf505))
* add Ns and Gaps to the table ([d443df6](https://github.com/neherlab/webclades/commit/d443df6904895371b5b01e96735fda0b68de3b69))
* add numbered X axis (position) to sequence view ([6d6304a](https://github.com/neherlab/webclades/commit/6d6304ae9573d1e8d29169825054dad4892df4cc))
* add progress bar embedded into the drop box ([2d058a6](https://github.com/neherlab/webclades/commit/2d058a63a6adeb0d33c960fbb42ec5585544fac7))
* add proper results table ([1bd4a49](https://github.com/neherlab/webclades/commit/1bd4a493aa780ee27b964a1d61b554db95285d05))
* add results download ([840aa80](https://github.com/neherlab/webclades/commit/840aa804da96039b756e4440af5b4f9fc9f8d185))
* add tooltips for the "sequence" and "clades" columns ([55e1cbe](https://github.com/neherlab/webclades/commit/55e1cbe9ce42cfaf0176dfabcc953db2a51efba3))
* add total number of mutations to the table ([04352f0](https://github.com/neherlab/webclades/commit/04352f0b674d0a33a776dd9228c92ce24757dc5a))
* add tree of clades ([4baa357](https://github.com/neherlab/webclades/commit/4baa357f04281e5b9b337e72aa80a9a29a47cee3))
* add upload ([a4c0bde](https://github.com/neherlab/webclades/commit/a4c0bdea55844490a65ea8062d6c3d0bbc32e99d))
* add version text to footer ([ee74087](https://github.com/neherlab/webclades/commit/ee74087123e50325d0b6ec23135134769fc09baa))
* allow parameters for multiple viruses ([4295cf6](https://github.com/neherlab/webclades/commit/4295cf66f318de9527876302f7c4ae9946775e12))
* avoid opening input box to speedup navigation to results page ([5d87ca8](https://github.com/neherlab/webclades/commit/5d87ca8dc0728c217ede2526685c4c018162bc98))
* borrow some more styling and components from nextstrain.org ([d264601](https://github.com/neherlab/webclades/commit/d26460151259554ef158dd530e29d2f1b47c8761))
* change example link text ([bb99908](https://github.com/neherlab/webclades/commit/bb99908e1a88f2aa925388ef982b708ee57d05a6))
* change nucleotide colors ([fb22e96](https://github.com/neherlab/webclades/commit/fb22e96572cd1ebfaf7981c6757b2266c60a8885))
* change text for clade mutations ([aff5073](https://github.com/neherlab/webclades/commit/aff507370f887c381e1c34697771dbdeecdcda50))
* cleanup and simplify marker tooltips ([34e54f9](https://github.com/neherlab/webclades/commit/34e54f9db2746a2e2fcb530a5d429ac3b3ce5136))
* cleanup gene tooltip ([87ec1ef](https://github.com/neherlab/webclades/commit/87ec1efc7daf35c19235b0f1f7a26ae3e4dc28a5))
* disable export button until the processing is complete ([1d50eb4](https://github.com/neherlab/webclades/commit/1d50eb412ad5f1405c6cbdc2d19e702aa6cd77a8))
* display alignment score ([fb62658](https://github.com/neherlab/webclades/commit/fb62658cb58e32a58e7f22c0295726afe95795b2))
* don't wrap the text in text area ([a8824b4](https://github.com/neherlab/webclades/commit/a8824b4b0d44ee3863b9b1f1de9262a8172f17d4))
* filter out empty clades ([f7405c0](https://github.com/neherlab/webclades/commit/f7405c013bf2f3a405335c9c1059274929f6c9a0))
* format mutations ([c49a5e2](https://github.com/neherlab/webclades/commit/c49a5e25761a357a261f34d8fb4e48b02e5a8272))
* format totals and clades in tooltips ([4361528](https://github.com/neherlab/webclades/commit/4361528ba5248a227e819f324c2625321aeffacf))
* group clades in mutation tooltips on gene map ([6971f9c](https://github.com/neherlab/webclades/commit/6971f9c9495d5481e324bf4f42fe2b63252a1929))
* implement reducer for updating results ([cae5fb1](https://github.com/neherlab/webclades/commit/cae5fb1a94ea249fa060124a661f4e4ddaad37e2))
* improve sequence view styling in dark mode ([b0e1327](https://github.com/neherlab/webclades/commit/b0e1327381a2fc74ac2bbff13e39e8bb576ff417))
* improve styling ([8d1fe93](https://github.com/neherlab/webclades/commit/8d1fe935456b3c2b2d46b39e1e821924e866d389))
* limit number of mutations in the tooltip to 10 ([4d6f077](https://github.com/neherlab/webclades/commit/4d6f077c1075d57970debc3f16542a3a1b0229f0))
* load example data when clicking the link ([7ceeed9](https://github.com/neherlab/webclades/commit/7ceeed9c91fbde6513db09b7aa554a27dae25eff))
* load no data, avoid running on startup ([fec2219](https://github.com/neherlab/webclades/commit/fec221968b52df6c69a2198881b4eaabba68b27e))
* make it more like nextstrain ([44092d7](https://github.com/neherlab/webclades/commit/44092d7d8a54421fe6f09de903d2ab680056c62d))
* make layout container fluid ([551a958](https://github.com/neherlab/webclades/commit/551a958f7c7c62b3269d15beb2cb804a815859ea))
* make separate runs per sequence in a saga ([662b3b8](https://github.com/neherlab/webclades/commit/662b3b8ca554d7ca48d3a785134ba825c84c00cd))
* make sure eslint, tsc and stylelint can be disabled in production ([d3c5f29](https://github.com/neherlab/webclades/commit/d3c5f2966cc232372be45693eb20a47b1d3f2d37))
* make sure redux dev tools can be enabled in production ([4cb3622](https://github.com/neherlab/webclades/commit/4cb3622f71cd7007e572cea2acebd8565a2f0f5f))
* make upload zone flat ([5ccf82c](https://github.com/neherlab/webclades/commit/5ccf82cad3e340104791e507775aadfcff4579fc))
* mention freedom and openness, add todos for more content ([5b1dcec](https://github.com/neherlab/webclades/commit/5b1dcec8ad0d9609e73569f8f2fa915b9e55369a))
* move file reader into parser worker ([5837c05](https://github.com/neherlab/webclades/commit/5837c059a2410ed66a6054ec5fa576ab214fba2e))
* navigate to results page on input change ([538d6e2](https://github.com/neherlab/webclades/commit/538d6e24f6f421ee5b62c7ece208dcd5aa0c5085))
* persist input box state on navigation ([52aa653](https://github.com/neherlab/webclades/commit/52aa653108cb3804f8c13bbc5d39e394ca9e40c7))
* prefetch index and results page for instant navigation ([8f3716d](https://github.com/neherlab/webclades/commit/8f3716dcca6e7361d42fbb4c469a87c7a06d9993))
* prettify dev alert ([b6c1795](https://github.com/neherlab/webclades/commit/b6c1795c930d905cf409273b50e718f98af0c9ee))
* prettify feature boxes ([641183c](https://github.com/neherlab/webclades/commit/641183c1ff78d0e507711083241326083c50cc1c))
* prettify hero section on landing page ([a99a792](https://github.com/neherlab/webclades/commit/a99a7926b970bed0bc68b03cdde76d23ae299b05))
* prettify info section ([95302ba](https://github.com/neherlab/webclades/commit/95302ba093b9cf304510d9834f85299a306034bf))
* prettify mdx content ([ae52e18](https://github.com/neherlab/webclades/commit/ae52e18425d134b10d374e603cce569b127acdea))
* reduce text spacing the the tooltip ([1c7176f](https://github.com/neherlab/webclades/commit/1c7176fd23790e75bccb2158f9e4f49abf6ae450))
* reimplement the old behavior in react ([fec0942](https://github.com/neherlab/webclades/commit/fec09428c477538d9b721a896c9f89172633f693))
* remove "Results" nav link ([010f6f9](https://github.com/neherlab/webclades/commit/010f6f9dc7fa64b0a37e0dad41d55e756db7e618))
* remove About page ([8ba236a](https://github.com/neherlab/webclades/commit/8ba236a77ad4ad21b53f88449b1360ddd0f35de8))
* remove input's border to not conflict with card border ([92cd724](https://github.com/neherlab/webclades/commit/92cd724e7eaa18a7c5857a4f23e0adfff10530cc))
* remove percentage text from the progress bar ([05d2623](https://github.com/neherlab/webclades/commit/05d2623e2648a732c168e1628352d07aad530be3))
* render results from Redux store ([de2d75a](https://github.com/neherlab/webclades/commit/de2d75a7420506e2ee7f7f7c9dacb2399f4356ba))
* reorganize the About section ([2df61f8](https://github.com/neherlab/webclades/commit/2df61f8fabe5e4c94e836dcf266c8fd19e3b8b83))
* replace QC text with icons ([56be063](https://github.com/neherlab/webclades/commit/56be0639538753955c1e68c6e6a283abafb4bc64))
* reset all translations ([766977f](https://github.com/neherlab/webclades/commit/766977ff7b7b9cf40088c31a2fff171daed5dd54))
* restrict container size to lg ([24145db](https://github.com/neherlab/webclades/commit/24145dbd63035f2942f7dbc48be940ede228de78))
* retrieve input text back from reader/parser worker ([c75ea79](https://github.com/neherlab/webclades/commit/c75ea79dbb2e9a73eef3f01737ef1832c1ec9a00))
* run sequence analysis in a worker pool concurrently (per sequence) ([a96f138](https://github.com/neherlab/webclades/commit/a96f13877298a328d893aaba5aacecb0eb214e6b))
* run the algorithm in a webworker ([54fcbee](https://github.com/neherlab/webclades/commit/54fcbee8e75a2238e5c00bcfa09502d7f2ee0e1d))
* run, navigate to results, and open paste dialog only when dropped a file  ([b3b7472](https://github.com/neherlab/webclades/commit/b3b747267a6d2d2fa57092c6e4c4abb0aebe0432))
* set gene colors from auspice  ([5d90436](https://github.com/neherlab/webclades/commit/5d9043667b94739989aafdfdde9983a1d26e8620))
* setup production build and static compression ([7cb0fac](https://github.com/neherlab/webclades/commit/7cb0faca6341a047743193f96bfc421714affe7f))
* show all clades ([c598f7b](https://github.com/neherlab/webclades/commit/c598f7b812d37e8a2ced062e01b25d234f80665f))
* show and focus input box, delay paste when loading the example ([7f5dbcc](https://github.com/neherlab/webclades/commit/7f5dbccd3922d4504517ac11864d112b09d3e72e))
* show sequence names early on, before analysis is completed ([a5d8754](https://github.com/neherlab/webclades/commit/a5d8754933107670e4df84b8e297d2cae3123360))
* show the gaps and Ns on the plot ([0704fb2](https://github.com/neherlab/webclades/commit/0704fb2c5ee3b3dbd32b29568e2a190fe2d1f092))
* show uploaded file name and size on the drop area ([039a0c5](https://github.com/neherlab/webclades/commit/039a0c578ec99c55390aa47949d8eb8db228c9b9))
* split upload and results into separate pages ([862ca3d](https://github.com/neherlab/webclades/commit/862ca3d351532221cf4f1be6a26bc614f647252d))
* translate more strings ([37dd6db](https://github.com/neherlab/webclades/commit/37dd6dbdf8792968fabebff039f21979e28b7794))
* write input filename and size into state ([61f1591](https://github.com/neherlab/webclades/commit/61f159174734f096bce19dec81410b800b783875))



