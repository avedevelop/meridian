import { TFunction } from 'i18next'
import { Dropdown } from '../controls/Dropdown'
import { TextInput } from '../controls/TextInput'
import { Toggle } from '../controls/Toggle'
import { SettingDefinition } from '../settingsTypes'

export function buildAiSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'askVaultProvider',
      label: t('settings.ai.provider'),
      description: t('settings.ai.providerDesc'),
      category: 'ai',
      render: (s) => (
        <Dropdown
          label={t('settings.ai.provider')}
          description={t('settings.ai.providerDesc')}
          value={s.askVaultProvider}
          options={[
            { value: 'local', label: t('settings.ai.provider.local') },
            { value: 'openai', label: t('settings.ai.provider.openai') },
            { value: 'custom', label: t('settings.ai.provider.custom') }
          ]}
          onChange={(v) => s.updateSetting('askVaultProvider', v)}
        />
      )
    },
    {
      id: 'askVaultSendLocalContext',
      label: t('settings.ai.sendLocalContext'),
      description: t('settings.ai.sendLocalContextDesc'),
      category: 'ai',
      render: (s) => (
        <Toggle
          label={t('settings.ai.sendLocalContext')}
          description={t('settings.ai.sendLocalContextDesc')}
          checked={s.askVaultSendLocalContext}
          onChange={(v) => s.updateSetting('askVaultSendLocalContext', v)}
        />
      )
    },
    {
      id: 'askVaultModel',
      label: t('settings.ai.model'),
      description: t('settings.ai.modelDesc'),
      category: 'ai',
      render: (s) => (
        <TextInput
          label={t('settings.ai.model')}
          description={t('settings.ai.modelDesc')}
          value={s.askVaultModel}
          placeholder="gpt-4.1-mini"
          onChange={(v) => s.updateSetting('askVaultModel', v)}
        />
      )
    },
    {
      id: 'askVaultEndpoint',
      label: t('settings.ai.endpoint'),
      description: t('settings.ai.endpointDesc'),
      category: 'ai',
      render: (s) => (
        <TextInput
          label={t('settings.ai.endpoint')}
          description={t('settings.ai.endpointDesc')}
          value={s.askVaultEndpoint}
          placeholder="https://api.example.com/v1/chat"
          onChange={(v) => s.updateSetting('askVaultEndpoint', v)}
        />
      )
    }
  ]
}
