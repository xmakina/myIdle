var Factories = {
  farm: {
    name: 'Farm',
    output: [{ type: 'food', amount: 100 }],
    input: [{ type: 'food', amount: 20 }],
    cost: [{ type: 'wood', amount: 10 }],
    time: 10000,
    factor: 1.2,
    revealed: true,
    upgrades: [
      {
        name: 'Fertiliser',
        cost: [{ type: 'food', amount: 50 }],
        max: 5,
        factor: 1.22,
        affects: ['output', 'food'],
        amount: 20
      },
      {
        name: 'Plow',
        cost: [{ type: 'wood', amount: 5 }],
        max: 10,
        factor: 1.4,
        affects: 'time',
        amount: -500
      }
    ],
    events: [
      {
        amount: 5,
        text: 'Now you have some food, why not build a wood cutter to gather wood for you'
      },
      {
        amount: 10,
        text: 'Make sure to upgrade your farms'
      },
      {
        amount: 0,
        text: 'Get your settlement started by building a farm to gather food'
      }
    ]
  },
  woodCutter: {
    name: 'Wood Cutter',
    output: [{ type: 'wood', amount: 1 }],
    input: [{ type: 'food', amount: 10 }],
    cost: [{ type: 'wood', amount: 5 }],
    time: 2500,
    factor: 1.1
  },
  stoneMiner: {
    name: 'Stone Miner',
    output: [{ type: 'stone', amount: 1 }],
    input: [{ type: 'food', amount: 20 }],
    cost: [{ type: 'wood', amount: 10 }],
    time: 2500,
    factor: 1.1
  },
  sawmill: {
    name: 'Sawmill',
    output: [{ type: 'plank', amount: 2 }],
    input: [{ type: 'wood', amount: 1 }, { type: 'food', amount: 20 }],
    cost: [{ type: 'wood', amount: 10 }, { type: 'stone', amount: 5 }],
    time: 5000,
    factor: 1.2
  },
  mason: {
    name: 'Stone Mason',
    output: [{ type: 'cutStone', amount: 2 }],
    input: [{ type: 'stone', amount: 1 }, { type: 'food', amount: 20 }],
    cost: [{ type: 'stone', amount: 10 }, { type: 'plank', amount: 10 }, { type: 'wood', amount: 10 }],
    time: 5000,
    factor: 1.2
  }
}

var Upgrades = {
  strength: {
    name: 'Strength',
    cost: [{ type: 'food', amount: 5 }],
    max: 3,
    factor: 1.1,
    affects: 'timeToGather',
    amount: -50
  },
  cart: {
    name: 'Cart',
    cost: [{ type: 'wood', amount: 5 }],
    max: 1,
    factor: 1,
    affects: 'gatherAmount',
    amount: 9
  }
}

var Resources = {}

var InputResources = {}
var OutputResources = {}
var GatherableResources = []

var UpgradeNames = {
  gatherAmount: 'Gather Amount',
  timeToGather: 'Time to gather'
}

var ResourceNames = {
  wood: 'Wood',
  food: 'Food',
  plank: 'Wooden Plank',
  stone: 'Stone',
  cutStone: 'Cut Stone'
}

function LoadFactories () {
  for (let factoryType in Factories) {
    let factory = Factories[factoryType]
    factory.total = 0
    factory.progress = 0
    factory.revealed = factory.revealed || false
    factory.paused = false
    factory.pausing = false
    for (let upgradeType in factory.upgrades) {
      var factoryUpgrade = factory.upgrades[upgradeType]
      factoryUpgrade.total = 0
      factoryUpgrade.revealed = false
    }

    for (let eventIndex in factory.events) {
      var event = factory.events[eventIndex]
      event.dismissed = false
    }

    AddResources(factory)
  }

  for (let upgradeType in Upgrades) {
    let upgrade = Upgrades[upgradeType]
    upgrade.total = 0
    upgrade.revealed = false
    AddResources(upgrade)
  }

  for (let resourceType in InputResources) {
    if (!OutputResources[resourceType]) {
      Resources[resourceType].revealed = true
      GatherableResources.push(resourceType)
    }
  }
}

function AddResources (factory) {
  let inputResources = {}

  if (factory.input) {
    for (let index = 0; index < factory.input.length; index++) {
      const element = factory.input[index]
      InputResources[element.type] = true
      inputResources[element.type] = true
      Resources[element.type] = {
        amount: 0,
        name: ResourceNames[element.type],
        revealed: false
      }
    }
  }

  if (factory.cost) {
    for (let index = 0; index < factory.cost.length; index++) {
      const element = factory.cost[index]
      InputResources[element.type] = true
      inputResources[element.type] = true
      Resources[element.type] = {
        amount: 0,
        name: ResourceNames[element.type],
        revealed: false
      }
    }
  }

  if (factory.output) {
    for (let index = 0; index < factory.output.length; index++) {
      const element = factory.output[index]
      if (!inputResources[element.type]) {
        OutputResources[element.type] = true
      }
      Resources[element.type] = {
        amount: 0,
        name: ResourceNames[element.type],
        revealed: false
      }
    }
  }
}

LoadFactories()
