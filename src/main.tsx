// React本体と、DOMにレンダリングする関数をimport
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// MSAL（Microsoft認証ライブラリ）のクラスとProviderをimport
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'

// 自分で作った認証設定（クライアントID、テナントIDなど）
import { msalConfig } from './config/msalConfig'

import './index.css'
import App from './App.tsx'

// MSAL(Microsoftアカウントでのログイン処理)のインスタンスを作成（認証機能の本体）
const msalInstance = new PublicClientApplication(msalConfig)

// initialize() でMSALの初期化を行う（非同期処理）
// .then() で初期化完了後にアプリをレンダリング
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* MsalProviderでAppを囲むことで、App内のどこからでも認証情報にアクセスできる */}
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  )
})
