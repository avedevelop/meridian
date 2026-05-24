export default class SamplePlugin {
  onLoad(api) {
    this.api = api
    console.log('[SamplePlugin] Loaded!')

    this.api.registerCommand({
      id: 'sample-command',
      title: 'Sample: Show Greeting Toast',
      run: (api) => {
        api.ui.toast('Hello! This greeting was triggered by a community plugin command!')
      }
    })
  }

  onUnload() {
    console.log('[SamplePlugin] Unloaded!')
  }
}
