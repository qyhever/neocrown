<template>
  <t-button
    variant="outline"
    :theme="expand ? 'primary' : 'default'"
    @click="onToggle"
  >
    <div class="flex items-center">
      <span>{{ expand ? '收起' : '高级搜索' }}</span>
      <ChevronUpIcon v-show="expand" class="w-4 text-gray-500" />
      <ChevronDownIcon v-show="!expand" class="w-4 text-gray-500" />
    </div>
  </t-button>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@lucide/vue'

defineOptions({
  name: 'ExpandButton',
})

const props = defineProps<{
  expand: boolean
}>()

const emit = defineEmits<{
  'update:expand': [value: boolean]
}>()

const onToggle = () => {
  emit('update:expand', !props.expand)
}
</script>
