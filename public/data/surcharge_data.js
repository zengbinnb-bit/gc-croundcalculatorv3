window.SURCHARGE_RULES = {
  'FedEx Ground': {
    dimDivisor: 8000,
    dimRoundUnit: 2.54,
    maxWeight: 67.5,
    maxLength: 274.32,
    maxGirth: 419.1,
    fuelSurcharge: true,
    formula: '(基础运费 + 附加费) × (1 + 燃油费率)',
    extraHandling: {
      overweight: {'Zone 2':7.13,'Zones 3-4':7.79,'Zones 5-6':8.72,'Zones 7+':9.11},
      oversize: {'Zone 2':4.57,'Zones 3-4':5.08,'Zones 5-6':5.97,'Zones 7+':6.32},
      irregular: {'Zone 2':6.63,'Zones 3-4':7.69,'Zones 5-6':8.26,'Zones 7+':8.44}
    },
    peakExtraHandling: {values:[4.13,5.45,4.13], periods:['2026/9/29-2026/11/23','2026/11/24-2026/12/28','2026/12/29-2027/1/18']},
    oversize: {
      residential: {'Zone 2':39.43,'Zones 3-4':42.53,'Zones 5-6':49.48,'Zones 7+':51.03}
    },
    peakOversize: {values:[45,54.25,45], periods:['2026/9/29-2026/11/23','2026/11/24-2026/12/28','2026/12/29-2027/1/18']},
    residential: {base:2.78, peak:1.1, peakPeriod:'2026/10/27-2027/1/18'},
    remote: {remoteRes:3.3, extendedRes:4.4},
    trigger: {
      overweight: 'actualWeight >= 22.5',
      oversize: 'longest >= 121.92 && longest <= 243.84 || secondLongest >= 76.2 || girth >= 266.7 || volume > 169901.08',
      irregular: 'irregularPackaging',
      oversizeLarge: 'longest >= 243.84 || girth >= 330.2 || volume > 283168.47 || actualWeight >= 49.83',
      unshippable: 'actualWeight >= 67.5 || longest >= 274.32 || girth >= 419.1'
    }
  },
  'GC Ground': {
    dimDivisor: 8000,
    dimRoundUnit: 2.54,
    maxWeight: 67.5,
    maxLength: 274.32,
    maxGirth: 419.1,
    fuelSurcharge: true,
    formula: '(基础运费 + 附加费) × (1 + 燃油费率)',
    extraHandling: {
      overweight: {'Zone 1':4.35,'Zone 2-3':4.75,'Zone 4-5':5.05,'Zone 6-7':5.5,'Zone 8':7.13,'Zone 9-10':7.79,'Zone11-12':8.72,'Zone 13-14':9.11},
      oversize: {'Zone 1':3.54,'Zone 2-3':3.93,'Zone 4-5':4.62,'Zone 6-7':4.89,'Zone 8':4.57,'Zone 9-10':5.08,'Zone11-12':5.97,'Zone 13-14':6.32},
      irregular: {'Zone 1':3.18,'Zone 2-3':3.69,'Zone 4-5':3.96,'Zone 6-7':4.05,'Zone 8':6.63,'Zone 9-10':7.69,'Zone11-12':8.26,'Zone 13-14':8.44}
    },
    peakExtraHandling: {values:[0,4.13,5.45,4.13], zoneSplit:true, lowZones:['Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7'], highZones:['Zone 8','Zone 9','Zone 10','Zone 11','Zone 12','Zone 13','Zone 14'], periods:['2026/9/29-2026/11/23','2026/11/24-2026/12/28','2026/12/29-2027/1/18']},
    oversize: {
      residential: {'Zone 1':21.68,'Zone 2-3':23.38,'Zone 4-5':27.2,'Zone 6-7':28.05,'Zone 8':39.43,'Zone 9-10':42.53,'Zone11-12':49.48,'Zone 13-14':51.03}
    },
    peakOversize: {values:[0,45,54.25,45], zoneSplit:true, lowZones:['Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7'], highZones:['Zone 8','Zone 9','Zone 10','Zone 11','Zone 12','Zone 13','Zone 14'], periods:['2026/9/29-2026/11/23','2026/11/24-2026/12/28','2026/12/29-2027/1/18']},
    residential: {base:2.68, peak:0.99, peakPeriod:'2026/10/27-2027/1/18', zoneSplit:true, lowZones:['Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7'], highZones:['Zone 8','Zone 9','Zone 10','Zone 11','Zone 12','Zone 13','Zone 14']},
    remote: {remoteRes:3.3, extendedRes:4.4},
    trigger: {
      overweight: 'actualWeight >= 22.5',
      oversize: 'longest >= 121.92 && longest <= 243.84 || secondLongest >= 76.2 || girth >= 266.7 || (zoneNum >= 8 && zoneNum <= 14 && volume > 169901.08)',
      irregular: 'irregularPackaging',
      oversizeLarge: 'longest >= 243.84 || girth >= 330.2 || volume > 283168.47 || actualWeight >= 49.83',
      unshippable: 'actualWeight >= 67.5 || longest >= 274.32 || girth >= 419.1'
    }
  },
  'UPS Ground': {
    dimDivisor: 8000,
    dimRoundUnit: 2.54,
    maxWeight: 67.5,
    maxLength: 274.32,
    maxGirth: 419.1,
    fuelSurcharge: true,
    formula: '（基础运费 + 实际产生的附加费用）×（1 + 燃油费率）',
    extraHandling: {
      overweight: {'Zone 2':7.13,'Zone 3-4':7.79,'Zone 5-6':8.72,'Zone7+':9.11},
      oversize: {'Zone 2':4.57,'Zone 3-4':5.08,'Zone 5-6':5.97,'Zone7+':6.32},
      irregular: {'Zone 2':6.63,'Zone 3-4':7.69,'Zone 5-6':8.26,'Zone7+':8.44}
    },
    peakExtraHandling: {values:[5.78,7.56,5.78], periods:['2026/9/28-2026/11/22','2026/11/23-2026/12/27','2026/12/28-2027/1/17']},
    oversize: {
      residential: {'Zone 2':165.43,'Zone 3-4':178.43,'Zone 5-6':208.33,'Zone7+':215.15}
    },
    peakOversize: {values:[63.35,74.90,63.35], periods:['2026/9/28-2026/11/22','2026/11/23-2026/12/27','2026/12/28-2027/1/17']},
    residential: {base:2.78, peak:1.1, peakPeriod:'2026/10/26-2027/1/17'},
    remote: {remoteRes:3.3, extendedRes:4.4},
    trigger: {
      overweight: 'actualWeight >= 22.5',
      oversize: 'longest >= 121.92 && longest <= 243.84 || secondLongest >= 76.2 || girth >= 266.7 || volume > 169901.08',
      irregular: 'irregularPackaging',
      oversizeLarge: 'longest >= 243.84 || girth >= 330.2 || volume > 283168.47 || actualWeight >= 49.83',
      unshippable: 'actualWeight >= 67.5 || longest >= 274.32 || girth >= 419.1'
    }
  },
  'Amazon Ground': {
    dimDivisor: 7000,
    dimRoundUnit: 2.54,
    maxWeight: 22.5,
    maxLength: 121.92,
    maxSecondLength: 76.2,
    maxGirth: 266.7,
    fuelSurcharge: true,
    formula: '(基础运费 + 附加费) × (1 + 燃油费率)',
    extraHandling: {
      nonStandard: {'Zone 2':11.00,'Zones 3-4':12.25,'Zones 5-8':14.15},
      oversizeLength: {'Zone 2':29.26,'Zones 3-4':32.59,'Zones 5-8':37.57},
      overweight: {'Zone 2':45.89,'Zones 3-4':49.88,'Zones 5-8':55.20},
      irregular: {'Zone 2':25.94,'Zones 3-4':30.59,'Zones 5-8':32.59}
    },
    peakExtraHandling: {values:[8.25,10.80,8.25], periods:['2026/10/26-2026/11/22','2026/11/23-2026/12/27','2026/12/28-2027/1/17']},
    peakSurcharge: {values:[0.40,0.60,0.40], periods:['2026/10/26-2026/11/22','2026/11/23-2026/12/27','2026/12/28-2027/1/17']},
    oversizeLarge: {
      unshippable: {'Zone 2':255.00,'Zone 3-4':275.00,'Zone 5-8':323.28}
    },
    peakOversizeLarge: {values:[90.00,107.00,90.00], periods:['2026/10/26-2026/11/22','2026/11/23-2026/12/27','2026/12/28-2027/1/17']},
    residential: {base:0, peak:0},
    remote: {remoteRes:0, extendedRes:0},
    trigger: {
      nonStandard: 'longest >= 93.98 || secondLongest >= 76.2 || thirdLongest >= 60.96',
      oversizeLength: 'longest >= 119.38 || secondLongest >= 106.68 || girth >= 266.7',
      overweight: 'actualWeight >= 22.67',
      irregular: 'irregularPackaging',
      oversizeLarge: 'longest >= 243.84 || girth >= 330.2',
      unshippable: 'actualWeight >= 67.5 || longest >= 274.32 || girth >= 419.1'
    }
  }
};

window.WAREHOUSES = {
  '美西-西雅图仓':{name:'美西-西雅图仓 (WA)',lat:47.61,lng:-122.33},
  '美西-洛杉矶仓':{name:'美西-洛杉矶仓 (CA)',lat:34.05,lng:-118.24},
  '美东南-萨凡纳仓':{name:'美东南-萨凡纳仓 (GA)',lat:32.08,lng:-81.09},
  '美东南-亚特兰大仓':{name:'美东南-亚特兰大仓 (GA)',lat:33.75,lng:-84.39},
  '美东-诺福克仓':{name:'美东-诺福克仓 (VA)',lat:36.85,lng:-76.29},
  '美东-新泽西州仓':{name:'美东-新泽西州仓 (NJ)',lat:40.72,lng:-74.07},
  '美中-芝加哥仓':{name:'美中-芝加哥仓 (IL)',lat:41.88,lng:-87.63},
  '美西南-达拉斯仓':{name:'美西南-达拉斯仓 (TX)',lat:32.78,lng:-96.80},
  '美西南-休斯顿仓':{name:'美西南-休斯顿仓 (TX)',lat:29.76,lng:-95.37},
  '美东南-迈阿密仓':{name:'美东南-迈阿密仓 (FL)',lat:25.76,lng:-80.19}
};

window.CHANNEL_WAREHOUSES = {
  'FedEx Ground': ['美东始发运费分区','美西始发运费分区','美南始发运费分区','美中始发运费分区','萨凡纳始发运费分区','达拉斯始发运费分区','休斯顿始发运费分区','西雅图始发运费分区','诺福克始发运费分区','偏远分区-Contiguous U.S.','超偏远分区-Contiguous U.S. Extended','Remote偏远分区-Contiguous U.S. Remote','偏远分区-Alaska','偏远分区-Hawaii'],
  'GC Ground': ['新泽西仓','加州仓','亚特兰大仓','芝加哥仓','萨凡纳仓'],
  'UPS Ground': ['新泽西仓始发运费分区','加州仓始发运费分区','亚特兰大仓始发运费分区','芝加哥仓始发运费分区','萨凡纳仓始发运费分区','达拉斯仓始发运费分区','休斯顿仓始发运费分区','西雅图仓始发运费分区','诺福克仓始发运费分区','偏远分区','超偏远分区','Remote US分区','Remote 夏威夷分区','Remote 阿拉斯加分区'],
  'Amazon Ground': ['美东始发运费分区 (邮编前3位或前5位）','美西始发运费分区 (邮编前3位或前5位）','美南始发运费分区','芝加哥仓始发运费分区','偏远分区']
};

window.ZONE_COLORS = {
  'Zone 1':'#e6194b','Zone 2':'#3cb44b','Zone 3':'#ffe119','Zone 4':'#4363d8',
  'Zone 5':'#f58231','Zone 6':'#911eb4','Zone 7':'#42d4f4','Zone 8':'#f032e6',
  'Zone 9':'#bfef45','Zone 10':'#fabed4','Zone 11':'#469990','Zone 12':'#dcbeff',
  'Zone 13':'#9A6324','Zone 14':'#fffac8','Zone 17':'#800000',
  'Zone 44':'#aaffc3','Zone 45':'#808000','Zone 46':'#ffd8b1',
  'Zone 1*':'#ff6666','Zone 2*':'#66ff66','Zone 3*':'#ffff66','Zone 4*':'#6666ff',
  'Zone 5*':'#ffaa66','Zone 6*':'#aa66ff','Zone 7*':'#66ffff','Zone 8*':'#ff66ff','Zone 9*':'#ddff66',
  '偏远地区':'#999999','超偏远地区':'#666666','Remote':'#333333',
  'DAS':'#cc9966','EDAS':'#9966cc'
};
