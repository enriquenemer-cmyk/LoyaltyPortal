# 3E Plataforma — App de Escritorio

## Requisitos previos
- Node.js 18 o superior: https://nodejs.org
- En Mac: Xcode Command Line Tools (`xcode-select --install`)
- En Windows: Visual Studio Build Tools o Visual Studio Community

## Pasos para generar el instalador

### 1. Instalar dependencias
```bash
cd electron-app
npm install
```

### 2a. Generar instalador para Windows (.exe)
```bash
npm run build:win
```
El archivo `dist/3E Plataforma Setup 1.0.0.exe` es el instalador para Windows.

### 2b. Generar instalador para Mac (.dmg)
```bash
npm run build:mac
```
El archivo `dist/3E Plataforma-1.0.0.dmg` es el instalador para Mac.

### 2c. Generar ambos a la vez (solo en Mac con Wine instalado)
```bash
npm run build:all
```

## Cómo funciona

1. El cliente descarga el instalador desde tu sitio web
2. Al abrir por primera vez, pide la **clave de licencia**
3. La clave se valida contra tu servidor en Vercel
4. Si es válida → abre la plataforma completa
5. Si está bloqueada → muestra pantalla de cuenta suspendida
6. Cada 7 días revalida. Si no hay internet, funciona con la validación guardada

## Cómo dar una clave al cliente

1. Entra al panel de licencias: `/admin/licencias`
2. Crea el cliente (restaurante + usuario + contraseña)
3. Haz clic en "Editar" → ahí aparece su **Clave de licencia** (ej: `3E-ABC12345-XYZABC`)
4. Cópiala y envíasela al cliente junto con el instalador

## Cómo bloquear un cliente

1. Panel de licencias → "Bloquear"
2. La próxima vez que el cliente abra la app y tenga internet, verá la pantalla de suspensión

## Distribución del instalador

Sube el archivo `.exe` / `.dmg` a tu sitio web o a Google Drive y comparte el link de descarga con tus clientes.

## Nota sobre íconos

Para que el instalador incluya el ícono de la app, coloca los siguientes archivos en `electron-app/assets/`:
- `icon.ico` (Windows, 256x256)
- `icon.icns` (Mac)
- `icon.png` (512x512, para Linux)

Puedes convertir el logo 3E usando: https://cloudconvert.com/png-to-ico
