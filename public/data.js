// DEMO DATA. Replace ZONES with the pipeline output (climatology_dekad -> monthly arrays) and every CROPS row with
// sourced values (FAO / IITA / ICRISAT or a local agronomist). Set PLACEHOLDER=false only when both are done.
const PLACEHOLDER = true;

// Monthly Jan..Dec: rain (mm), tmax (C), rh (%), ndvi (0-1). lowPos/slope come from SRTM terrain.json.
const ZONES = {
  kano:    {name:"Kano",    rain:[0,0,2,12,70,120,200,290,150,25,0,0], tmax:[31,34,37,38,36,33,30,29,31,34,33,31], rh:[25,20,20,30,45,60,72,78,70,45,32,28], ndvi:[.18,.16,.15,.17,.24,.38,.55,.68,.62,.40,.25,.20], lowPos:.5, slope:1.2},
  katsina: {name:"Katsina", rain:[0,0,2,10,55,100,180,270,130,20,0,0], tmax:[31,34,37,39,37,34,31,30,32,35,34,31], rh:[24,19,19,28,42,58,70,76,68,42,30,26], ndvi:[.17,.15,.14,.16,.22,.35,.52,.64,.58,.37,.23,.19], lowPos:.5, slope:1.5},
  sokoto:  {name:"Sokoto",  rain:[0,0,2,8,45,85,140,230,110,15,0,0],  tmax:[33,36,39,41,40,36,32,31,33,37,36,33], rh:[22,17,17,24,38,52,66,72,62,36,26,24], ndvi:[.15,.14,.13,.14,.19,.30,.46,.58,.52,.32,.20,.17], lowPos:.5, slope:.9}
};

// Qualitative 1-5 scales (5 = best tolerance; rot: 5 = most rot-prone in storage).
// n name, fam family, cyc cycle days, w seasonal water need mm [min,max], pm planting month (1-12),
// heat/dry/flood tolerance, rot storage rot sensitivity, nfix nitrogen fixing, ero erosion cover.
const CROPS = {
  millet:   {n:"Pearl millet",  fam:"cereal", cyc:90,  w:[300,450],  pm:6, heat:5, dry:5, flood:1, rot:2, nfix:0, ero:3},
  sorghum:  {n:"Sorghum",       fam:"cereal", cyc:115, w:[450,650],  pm:6, heat:4, dry:4, flood:3, rot:2, nfix:0, ero:3},
  maize:    {n:"Maize",         fam:"cereal", cyc:105, w:[500,800],  pm:6, heat:3, dry:2, flood:2, rot:4, nfix:0, ero:2},
  cowpea:   {n:"Cowpea",        fam:"legume", cyc:75,  w:[300,500],  pm:7, heat:4, dry:4, flood:1, rot:3, nfix:1, ero:4},
  groundnut:{n:"Groundnut",     fam:"legume", cyc:105, w:[450,650],  pm:6, heat:3, dry:3, flood:1, rot:5, nfix:1, ero:4},
  rice:     {n:"Rainfed rice",  fam:"cereal", cyc:125, w:[900,1200], pm:6, heat:3, dry:1, flood:5, rot:3, nfix:0, ero:2}
};
