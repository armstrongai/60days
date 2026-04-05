import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureDatabaseSeeded } from './db'
import { LicenseProvider } from './LicenseContext'
import {
  checkLicenseStatus,
  expireTrialIfNeeded,
  initUserProfileFromUrl,
} from './license'

void ensureDatabaseSeeded()
  .then(async () => {
    await initUserProfileFromUrl()
    await expireTrialIfNeeded()
    await checkLicenseStatus()
  })
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <LicenseProvider>
          <App />
        </LicenseProvider>
      </StrictMode>,
    )
  })
