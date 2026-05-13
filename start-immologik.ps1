cd C:\Users\ugoel\immologik\apps\api
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
Start-Process pnpm.cmd -ArgumentList "start:prod"

Start-Sleep -Seconds 5

cd C:\Users\ugoel\immologik\apps\web
pnpm install
pnpm build
pnpm start
