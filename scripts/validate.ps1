
**`scripts/validate.ps1`**

```powershell
$ErrorActionPreference = "Stop"

npm run test --workspace=backend
npm run test --workspace=frontend
npm run build:backend
npm run build:frontend