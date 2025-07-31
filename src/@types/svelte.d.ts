/**
 * Svelte コンポーネントの型定義
 */

declare module "*.svelte" {
  import type { ComponentType, SvelteComponentTyped } from "svelte";

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ComponentEvents {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ComponentSlots {}

  const component: ComponentType<SvelteComponentTyped<Record<string, unknown>, ComponentEvents, ComponentSlots>>;
  export default component;
}

declare module "../../../popup/OptionsApp.svelte" {
  import type { ComponentType, SvelteComponentTyped } from "svelte";

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Props {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Events {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Slots {}

  const component: ComponentType<SvelteComponentTyped<Props, Events, Slots>>;
  export default component;
}
