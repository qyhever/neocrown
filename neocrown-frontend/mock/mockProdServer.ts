// https://github.com/vbenjs/vite-plugin-mock
import { createProdMockServer } from 'vite-plugin-mock/client'
import appModule from './app'
import projectModule from './project'

export function setupProdMockServer() {
  createProdMockServer([...appModule, ...projectModule])
}
