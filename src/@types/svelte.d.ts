/**
 * Svelte コンポーネントの型定義
 */

declare module "*.svelte" {
  import type { ComponentType, SvelteComponentTyped } from "svelte";
  
  interface ComponentConstructorOptions<Props extends Record<string, any> = {}> {
    target: Element | Document | ShadowRoot;
    anchor?: Element;
    props?: Props;
    context?: Map<any, any>;
    hydrate?: boolean;
    intro?: boolean;
  }
  
  interface ComponentEvents {}
  
  interface ComponentSlots {}
  
  const component: ComponentType<SvelteComponentTyped<any, ComponentEvents, ComponentSlots>>;
  export default component;
}

declare module "../../../popup/OptionsApp.svelte" {
  import type { ComponentType, SvelteComponentTyped } from "svelte";
  
  interface Props {}
  interface Events {}
  interface Slots {}
  
  const component: ComponentType<SvelteComponentTyped<Props, Events, Slots>>;
  export default component;
}