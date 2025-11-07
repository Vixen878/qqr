# CBE EMVCo QR Code Generator (Experimental)

A Next.js app that builds EMVCo-compliant payment QR code payloads specifically for the Commercial Bank of Ethiopia (CBE). This tool simplifies the creation of interoperable payment QR codes that adhere to the Ethiopian national standard (IPS-ET).

## What It Does

In Ethiopia, the move towards a unified digital payment system requires merchants to use standardized QR codes that can be scanned by any customer, regardless of their banking app. This tool automates the complex process of creating these QR codes for CBE merchants.

It takes simple merchant details (name, city, account number) and transforms them into a valid **EMVCo Tag-Length-Value (TLV)** payload string. It calculates UTF-8 byte lengths, builds the domestic scheme template for CBE, and computes the mandatory **CRC-16/CCITT-FALSE** checksum for data integrity.

The result is a reliable, compliant QR code ready for print and use.

## Pages

- `/` (`src/app/page.tsx`): Simple generator with common fields (merchant name, CBE account, optional amount for dynamic QR, optional purpose). Always includes Name `59` and City `60` (defaults to “Addis Ababa”). Uses the central builder in `src/lib/emvqr.ts`.
- `/advanced` (`src/app/advanced/page.tsx`): Structured builder with per-tag toggles (`28/00` GUID, `52` MCC, `54` Amount, `59` Name, `60` City, `62` sub-tags, `80` Context) and tag-order switch (`spec` vs `cbe`). Builds TLV locally and appends CRC16 CCITT-FALSE.

## Features

- EMV TLV builder; CBE MAI28 (`28/01` BIC, `28/02` account/phone, optional `28/00` GUID).
- Static vs dynamic QR via POI Method `01`: `11` static, `12` dynamic (when amount is set).
- Server-rendered QR SVG via `GET /api/qr?payload=...`.
- Payload inspector for tag/length/value breakdown.
- Tailwind + shadcn/ui.

## Quick Start

- Dev: `pnpm dev`, open `http://localhost:3000`.
- Build: `pnpm build`, start: `pnpm start`.

## API

- `GET /api/qr?payload=...` → returns SVG QR.


## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## UI Components

This project is configured with [shadcn/ui](https://ui.shadcn.com/) using the "default" style. You can add new components using:

```bash
pnpm dlx shadcn@latest add [component-name]
```

Components are located in the `src/components/ui` directory and can be imported and used throughout your application.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [shadcn/ui Documentation](https://ui.shadcn.com/) - learn about the UI component library.

