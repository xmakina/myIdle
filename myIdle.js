let app = new Vue({
  el: '#app',
  data: function () {
    return {
      ready: true,
      canGatherIn: 0,
      stockpile: Resources,
      factories: Factories,
      gatherable: GatherableResources,
      lastGathered: null,
      timeToGather: 1,
      gathering: false,
      gatherAmount: 1,
      upgrades: Upgrades
    }
  },
  methods: {
    gather: function (item, amount) {
      this.lastGathered = item
      this.canGatherIn = this.timeToGather
      this.gathering = true
    },
    checkUpgrades: function (factory) {
      if (factory.total === 0) {
        return
      }

      for (let upgradeType in factory.upgrades) {
        let factoryUpgrade = factory.upgrades[upgradeType]
        if (factoryUpgrade.revealed) {
          return
        }

        if (this.canBuild(factoryUpgrade)) {
          factoryUpgrade.revealed = true
        }
      }
    },
    addToStockpile: function (item, amount) {
      if (amount === undefined) {
        amount = 1
      }

      this.stockpile[item].amount += amount
      if (!this.stockpile[item].revealed) {
        this.stockpile[item].revealed = true
      }

      for (let factoryType in this.factories) {
        let factory = this.factories[factoryType]

        if (factory.revealed) {
          this.checkUpgrades(factory)
          continue
        }

        if (this.canBuild(factory)) {
          factory.revealed = true
          this.checkUpgrades(factory)
        }
      }

      for (let upgradeType in this.upgrades) {
        let upgrade = this.upgrades[upgradeType]

        if (upgrade.revealed) {
          continue
        }

        if (this.canBuild(upgrade)) {
          upgrade.revealed = true
        }
      }
    },
    update: function () {
      if (this.ready === false) {
        console.warn('not ready')
        return
      } else {
        this.ready = false
      }

      for (let factoryType in this.factories) {
        let factory = this.factories[factoryType]
        this.updateFactory(factory)
      }

      this.ready = true
      if (this.gathering) {
        this.canGatherIn--
        if (this.canGatherIn <= 0) {
          this.addToStockpile(this.lastGathered, this.gatherAmount)
          this.gathering = false
        }
      }
    },
    gatheringPercent: function () {
      return (this.timeToGather - this.canGatherIn) / this.timeToGather * 100
    },
    percent: function (factory) {
      return factory.progress / factory.time * 100
    },
    updateFactory: function (factory) {
      if (factory.total === 0 || factory.paused) {
        return
      }

      if (factory.input && factory.progress === 0) {
        if (this.hasNeeds(factory)) {
          return
        }

        for (let index = 0; index < factory.input.length; index++) {
          const element = factory.input[index]
          this.stockpile[element.type].amount -= element.amount
        }
      }

      factory.progress += factory.total
      if (factory.progress >= factory.time) {
        factory.progress = 0
        for (let index = 0; index < factory.output.length; index++) {
          const element = factory.output[index]
          this.addToStockpile(element.type, element.amount)
        }
      }
    },
    canBuild: function (factory, amount) {
      let costOfFactory = this.costOfFactory(factory, true)
      if (amount) {
        costOfFactory = this.batchCostOfFactory(factory, true, amount)
      }

      for (let resourceType in costOfFactory) {
        if (this.stockpile[resourceType].amount < costOfFactory[resourceType]) {
          return false
        }
      }

      return true
    },
    build: function (factory, amount) {
      let costOfFactory = this.costOfFactory(factory, true)
      if (amount) {
        costOfFactory = this.batchCostOfFactory(factory, true, amount)
      }

      for (let resourceType in costOfFactory) {
        this.stockpile[resourceType].amount -= costOfFactory[resourceType]
      }

      if (factory.total === 0) {
        factory.progress = 1
      }

      if (amount) {
        factory.total += amount
      } else {
        factory.total++
      }

      this.checkUpgrades(factory)
    },
    batchCostOfFactory: function (factory, merged, target) {
      let total = { input: {}, cost: {} }
      for (let i = factory.total; i < factory.total + target; i++) {
        let costOfFactory = this.costOfFactory(factory, false, i)
        for (let element in costOfFactory.input) {
          if (!total.input[element]) {
            total.input[element] = 0
          }

          total.input[element] += costOfFactory.input[element]
        }
        for (let element in costOfFactory.cost) {
          if (!total.cost[element]) {
            total.cost[element] = 0
          }

          total.cost[element] += costOfFactory.cost[element]
        }
      }

      if (merged) {
        let mergedResult = {}
        for (let element in total.input) {
          if (!merged[element]) {
            mergedResult[element] = 0
          }

          mergedResult[element] += total.input[element]
        }

        for (let element in total.cost) {
          if (!mergedResult[element]) {
            mergedResult[element] = 0
          }

          mergedResult[element] += total.cost[element]
        }

        return mergedResult
      }

      return total
    },
    costOfFactory: function (factory, merged, fakeTotal) {
      let input = {}
      if (factory.input) {
        for (let index = 0; index < factory.input.length; index++) {
          const element = factory.input[index]
          input[element.type] = element.amount
        }
      }

      let cost = {}
      if (factory.cost) {
        for (let index = 0; index < factory.cost.length; index++) {
          const element = factory.cost[index]
          cost[element.type] = element.amount * Math.pow(factory.factor, fakeTotal || factory.total)
        }
      }

      if (merged) {
        let mergedResult = {}
        for (let element in input) {
          if (!mergedResult[element]) {
            mergedResult[element] = 0
          }

          mergedResult[element] += input[element]
        }

        for (let element in cost) {
          if (!mergedResult[element]) {
            mergedResult[element] = 0
          }

          mergedResult[element] += cost[element]
        }

        return mergedResult
      }

      return { input, cost }
    },
    showDelay: function (factory) {
      return factory.progress === 0 && factory.total > 0 && this.hasNeeds(factory)
    },
    hasNeeds: function (factory) {
      for (let index = 0; index < factory.input.length; index++) {
        const element = factory.input[index]
        if (this.stockpile[element.type].amount < element.amount) {
          return true
        }
      }

      return false
    },
    pauseFactory: function (factory) {
      factory.paused = !factory.paused
    },
    addUpgrade: function (upgrade) {
      this.build(upgrade)
      if (upgrade.parent) {
        if (upgrade.affects instanceof Array) {
          var outputList = upgrade.parent[upgrade.affects[0]]
          for (var i = 0; i < outputList.length; i++) {
            if (outputList[i].type === upgrade.affects[1]) {
              outputList[i].amount += upgrade.amount
              return
            }
          }
        } else {
          upgrade.parent[upgrade.affects] += upgrade.amount
        }
      } else {
        this[upgrade.affects] += upgrade.amount
      }
    },
    canUpgrade: function (upgrade) {
      return upgrade.total < upgrade.max
    },
    isAnArray: function (input) {
      if (input) {
        return input.isArray()
      }

      return false
    },
    displayEvent: function (factory, index) {
      if (factory.events[index].dismissed) {
        return false
      }

      return factory.events[index].amount <= factory.total
    },
    dismiss: function (event) {
      event.dismissed = true
    }
  },
  created: function () {
    setInterval(this.update, 1)
  },
  computed: {
    revealedFactories () {
      let result = []
      for (let factoryType in this.factories) {
        let factory = this.factories[factoryType]
        if (factory.revealed) {
          result.push(factory)
        }
      }

      return result
    },
    revealedStockpile () {
      let result = []
      for (let resourceType in this.stockpile) {
        let resource = this.stockpile[resourceType]
        if (resource.revealed) {
          result.push(resource)
        }
      }

      return result
    },
    revealedUpgrades () {
      let result = []
      for (let upgradeType in this.upgrades) {
        let upgrade = this.upgrades[upgradeType]
        if (upgrade.revealed) {
          result.push(upgrade)
        }
      }

      for (let factoryType in this.factories) {
        let factory = this.factories[factoryType]
        for (let upgradeType in factory.upgrades) {
          let factoryUpgrade = factory.upgrades[upgradeType]
          if (factoryUpgrade.revealed) {
            factoryUpgrade.parent = factory
            result.push(factoryUpgrade)
          }
        }
      }

      return result
    }
  },
  filters: {
    numerical: function (i) {
      if (i < 100000) {
        return Math.ceil(i)
      }
      return i.toExponential(1)
    },
    percent: function (i) {
      return Math.round(i) + '%'
    },
    resourceName: function (i) {
      if (ResourceNames[i]) {
        return ResourceNames[i]
      }

      return i
    },
    upgradeName: function (i) {
      if (UpgradeNames[i]) {
        return UpgradeNames[i]
      }

      return i
    },
    pause: function (i) {
      if (i) {
        return 'Resume'
      }

      return 'Halt'
    },
    direction: function (i) {
      if (i < 0) {
        return 'decreases'
      }

      return 'increases'
    },
    alwaysPositive: function (i) {
      if (i < 0) {
        return i * -1
      }

      return i
    }
  }
})
