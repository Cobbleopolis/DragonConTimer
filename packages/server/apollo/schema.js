import { withFilter } from 'graphql-subscriptions'
import { schemaComposer } from 'graphql-compose'
import { composeMongoose } from 'graphql-compose-mongoose'

import ConsoleModel from '../models/Console.js'
import StationModel  from '../models/Station.js'
import GlobalSettingModel from '../models/GlobalSetting.js'

const composeOptions = {}

const models = {
    console: ConsoleModel,
    station: StationModel,
    globalSetting: GlobalSettingModel
}

let TypeComposers = {}

for(const [key, value] of Object.entries(models)) {
    TypeComposers[key] = composeMongoose(value, composeOptions)
}

export default function(pubsub) {
    function generateQueryObj(prefix, typeComposer) {
        // let pluralPrefix = pluralize(prefix)
        let pluralPrefix = prefix
        let queryObj = {}
        queryObj[prefix + 'ById'] = typeComposer.mongooseResolvers.findById()
        queryObj[pluralPrefix + 'ByIds'] = typeComposer.mongooseResolvers.findByIds()
        queryObj[prefix] = typeComposer.mongooseResolvers.findOne()
        queryObj[pluralPrefix] = typeComposer.mongooseResolvers.findMany()
        queryObj[prefix + 'DataLoader'] = typeComposer.mongooseResolvers.dataLoader()
        queryObj[prefix + 'DataLoadersMany'] = typeComposer.mongooseResolvers.dataLoaderMany()
        queryObj[prefix + 'ByIdLean'] = typeComposer.mongooseResolvers.findById({ lean: true, })
        queryObj[pluralPrefix + 'ByIdsLean'] = typeComposer.mongooseResolvers.findByIds({ lean: true })
        queryObj[prefix + 'OneLean'] = typeComposer.mongooseResolvers.findOne({ lean: true })
        queryObj[pluralPrefix + 'Lean'] = typeComposer.mongooseResolvers.findMany({ lean: true })
        queryObj[prefix + 'DataLoaderLean'] = typeComposer.mongooseResolvers.dataLoader({ lean: true })
        queryObj[prefix + 'DataLoadersManyLean'] = typeComposer.mongooseResolvers.dataLoaderMany({ lean: true })
        queryObj[prefix + 'Count'] = typeComposer.mongooseResolvers.count()
        queryObj[prefix + 'Connection'] = typeComposer.mongooseResolvers.connection()
        queryObj[prefix + 'Pagination'] = typeComposer.mongooseResolvers.pagination()
        return queryObj
    }

    function determineMutationOperation(mutationName) {
        if(mutationName.toLowerCase().indexOf('create') !== -1) {
            return 'Create'
        } else if (mutationName.toLowerCase().indexOf('update') !== -1) {
            return 'Update'
        } else if (mutationName.toLowerCase().indexOf('remove') !== -1) {
            return 'Remove'
        }
    }
    
    function generateMutationObj(prefix, typeComposer) {
        let mutationObj = {}
        mutationObj[prefix + 'Create'] = typeComposer.mongooseResolvers.createOne()
        mutationObj[prefix + 'CreateMany'] = typeComposer.mongooseResolvers.createMany()
        mutationObj[prefix + 'UpdateById'] = typeComposer.mongooseResolvers.updateById()
        mutationObj[prefix + 'UpdateOne'] = typeComposer.mongooseResolvers.updateOne()
        mutationObj[prefix + 'UpdateMany'] = typeComposer.mongooseResolvers.updateMany()
        mutationObj[prefix + 'RemoveById'] = typeComposer.mongooseResolvers.removeById()
        mutationObj[prefix + 'RemoveOne'] = typeComposer.mongooseResolvers.removeOne()
        mutationObj[prefix + 'RemoveMany'] = typeComposer.mongooseResolvers.removeMany()
    
        // Generate subscription hooks
        Object.keys(mutationObj).forEach((k) => {
            mutationObj[k] = mutationObj[k].wrapResolve(next => async rp => {

                // extend resolve params with hook
                const mutationOperation = prefix + determineMutationOperation(k)
                rp.beforeRecordMutate = async function (doc) {
                    pubsub.publish(mutationOperation, { [mutationOperation]: doc })
                    return doc
                }

                return next(rp)
            })
        })
    
        return mutationObj
    }
    
    function generateSubscriptionObj(prefix, typeComposer) {
        const keys = [
            prefix + 'Create',
            prefix + 'Update',
            prefix + 'Remove'
        ]
        let subscriptionObj = {}
        keys.forEach(k => {
            subscriptionObj[k] = {
                type: typeComposer,
                resolve: payload => payload[k],
                subscribe: () => pubsub.asyncIterator(k)
            }
            if (!k.includes('Create')) {
                subscriptionObj[k + 'ById'] = {
                    type: typeComposer,
                    args: {
                        recordId: 'MongoID!'
                    },
                    resolve: payload => payload[k],
                    subscribe: withFilter(
                        () => pubsub.asyncIterator(k),
                        (payload, variables) => payload[k]._id.toString() === variables.recordId
                    )
                }
                subscriptionObj[k + 'ByIds'] = {
                    type: typeComposer,
                    args: {
                        recordIds: '[MongoID]!'
                    },
                    resolve: payload => payload[k],
                    subscribe: withFilter(
                        () => pubsub.asyncIterator(k),
                        (payload, variables) => variables.recordIds.includes(payload[k]._id.toString())
                    )
                }
            }
        })
    
        // let changedKey = prefix + 'Changed'
        // subscriptionObj[changedKey] = {
        //     type: typeComposer,
        //     resolve: payload => payload[changedKey],
        //     subscribe: () => pubsub.asyncIterator(changedKey)
        // }
        
        return subscriptionObj
    }
    
    function registerType(name, typeComposer) {
        schemaComposer.Query.addFields(generateQueryObj(name, typeComposer))
        schemaComposer.Mutation.addFields(generateMutationObj(name, typeComposer))
        schemaComposer.Subscription.addFields(generateSubscriptionObj(name, typeComposer))
    }
    
    // registerType('console', ConsoleTypeComposer)
    // registerType('station', StationTypeComposer)

    for(const [key, value] of Object.entries(TypeComposers)) {
        registerType(key, value)
    }
    
    const schema = schemaComposer.buildSchema()

    return schema
}