/**
 * Turning clipboard recording on needs a native confirmation. A community plugin runs in the same
 * window as the settings page, so a switch in the page proves nothing; a system dialog cannot be
 * clicked by page code.
 */
export interface ConsentText {
  title: string
  detail: string
  confirm: string
  cancel: string
}

const TEXT: Record<'en' | 'ru' | 'nb', ConsentText> = {
  en: {
    title: 'Turn on clipboard history?',
    detail:
      'Meridian will keep what you copy on this computer only. Anything that looks like a password or key is hidden. You can pause or clear the history at any time.',
    confirm: 'Turn on',
    cancel: 'Cancel'
  },
  ru: {
    title: 'Включить историю буфера обмена?',
    detail:
      'Meridian будет хранить скопированное только на этом компьютере. Всё, что похоже на пароль или ключ, скрывается. Историю можно в любой момент приостановить или очистить.',
    confirm: 'Включить',
    cancel: 'Отмена'
  },
  nb: {
    title: 'Slå på utklippstavlehistorikk?',
    detail:
      'Meridian lagrer det du kopierer kun på denne datamaskinen. Alt som ligner et passord eller en nøkkel blir skjult. Du kan sette historikken på pause eller tømme den når som helst.',
    confirm: 'Slå på',
    cancel: 'Avbryt'
  }
}

export function consentText(language: unknown): ConsentText {
  return language === 'ru' || language === 'nb' ? TEXT[language] : TEXT.en
}
