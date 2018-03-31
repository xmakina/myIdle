var app = new Vue({
    el: '#app',
    data: function () {
        return {
            ready: true,
            canGatherIn: 0,
            stockpile: Resources,
            factories: Factories,
            gatherable: GatherableResources,
            lastGathered: null,
            timeToGather: 300,
            gatherAmount: 1
        }
    },
    methods: {
        gather: function (item, amount) {
            this.lastGathered = item
            this.canGatherIn = this.timeToGather
        },
        addToStockpile: function (item, amount) {
            if (amount === undefined) {
                amount = 1
            }

            this.stockpile[item].amount += amount
            if (!this.stockpile[item].revealed) {
                this.stockpile[item].revealed = true
            }

            for (factoryType in this.factories) {
                var factory = this.factories[factoryType]

                if (factory.revealed) {
                    continue
                }

                if (this.canBuild(factory)) {
                    factory.revealed = true
                }
            }
        },
        update: function () {
            if (this.ready === false) {
                console.log('not ready')
                return
            } else {
                this.ready = false
            }

            for (var factoryType in this.factories) {
                var factory = this.factories[factoryType]
                this.updateFactory(factory)
            }

            this.ready = true
            if (this.canGatherIn > 0) {
                this.canGatherIn--
                if (this.canGatherIn === 0) {
                    this.addToStockpile(this.lastGathered, this.gatherAmount)
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
                    const element = factory.input[index];
                    this.stockpile[element.type].amount -= element.amount
                }
            }

            factory.progress += factory.total
            if (factory.progress >= factory.time) {
                factory.progress = 0
                for (let index = 0; index < factory.output.length; index++) {
                    const element = factory.output[index];
                    this.addToStockpile(element.type, element.amount)
                }
            }
        },
        canBuild: function (factory, amount) {
            var costOfFactory = this.costOfFactory(factory, true)
            if (amount) {
                costOfFactory = this.batchCostOfFactory(factory, true, amount)
            }

            for (resourceType in costOfFactory) {
                if (this.stockpile[resourceType].amount < costOfFactory[resourceType]) {
                    return false
                }
            }

            return true
        },
        build: function (factory, amount) {
            var costOfFactory = this.costOfFactory(factory, true)
            if (amount) {
                costOfFactory = this.batchCostOfFactory(factory, true, amount)
            }

            for (resourceType in costOfFactory) {
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
        },
        batchCostOfFactory: function (factory, merged, target) {
            var total = { input: {}, cost: {} }
            for (var i = factory.total; i < factory.total + target; i++) {
                var costOfFactory = this.costOfFactory(factory, false, i)
                for (element in costOfFactory.input) {
                    if (!total.input[element]) {
                        total.input[element] = 0
                    }

                    total.input[element] += costOfFactory.input[element]
                }
                for (element in costOfFactory.cost) {
                    if (!total.cost[element]) {
                        total.cost[element] = 0
                    }

                    total.cost[element] += costOfFactory.cost[element]
                }
            }

            if (merged) {
                var merged = {}
                for (element in total.input) {
                    if (!merged[element]) {
                        merged[element] = 0
                    }

                    merged[element] += total.input[element]
                }

                for (element in total.cost) {
                    if (!merged[element]) {
                        merged[element] = 0
                    }

                    merged[element] += total.cost[element]
                }

                return merged
            }

            return total
        },
        costOfFactory: function (factory, merged, fakeTotal) {
            var input = {}
            if (factory.input) {
                for (let index = 0; index < factory.input.length; index++) {
                    const element = factory.input[index];
                    input[element.type] = element.amount
                }
            }

            var cost = {}
            if (factory.cost) {
                for (let index = 0; index < factory.cost.length; index++) {
                    const element = factory.cost[index];
                    cost[element.type] = element.amount * Math.pow(factory.factor, fakeTotal || factory.total)
                }
            }

            if (merged) {
                var merged = {}
                for (element in input) {
                    if (!merged[element]) {
                        merged[element] = 0
                    }

                    merged[element] += input[element]
                }

                for (element in cost) {
                    if (!merged[element]) {
                        merged[element] = 0
                    }

                    merged[element] += cost[element]
                }

                return merged
            }

            return { input, cost }
        },
        loadFactories() {
            for (factoryType in this.factories) {
                let factory = Factories[factoryType]
                factory.total = 0 // TODO: Load this
                factory.progress = 0
            }

            this.stockpile.food.amount = 10
            this.stockpile.wood.amount = 4
        },
        showDelay: function (factory) {
            return factory.progress === 0 && factory.total > 0 && this.hasNeeds(factory)
        },
        hasNeeds: function (factory) {
            for (let index = 0; index < factory.input.length; index++) {
                const element = factory.input[index];
                if (this.stockpile[element.type].amount < element.amount) {
                    return true
                }
            }

            return false
        },
        pauseFactory: function (factory) {
            factory.paused = !factory.paused
        }
    },
    created: function () {
        this.loadFactories()
        setInterval(this.update, 1)
    },
    computed: {
        revealedFactories() {
            var result = []
            for (factoryType in this.factories) {
                var factory = this.factories[factoryType]
                if (factory.revealed) {
                    result.push(factory)
                }
            }

            return result
        },
        revealedStockpile() {
            var result = []
            for (resourceType in this.stockpile) {
                var resource = this.stockpile[resourceType]
                if (resource.revealed) {
                    result.push(resource)
                }
            }

            return result
        }
    },
    filters: {
        numerical: function (i) {
            var factor = Math.pow(10, 0)
            return Math.round(i * factor) / factor
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
        pause: function (i) {
            if (i) {
                return 'Resume'
            }

            return 'Halt'
        }
    }
})