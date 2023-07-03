<template>
    <div class="test">
        <h1>This is a test page</h1>
        <br />
        <ul>
            <li v-for="console of consoles" :key="console._id">{{ console.name }}</li>
        </ul>
        <br />
        <div class="container py-4 px-3 mx-auto">
            <button class="btn btn-primary">Primary button</button>
        </div>
    </div>
</template>

<script>
import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

export default {
    setup() {
        const { result } = useQuery(gql`query {
                                            console {
                                                _id
                                                games {
                                                    count
                                                    name
                                                }
                                                name
                                            }
                                        }`)
        const consoles = computed(() => result.value?.console ?? [])

        return {
            test: 'Hello, World',
            consoles
        }
    }
}
</script>
  
<style>

</style>
  