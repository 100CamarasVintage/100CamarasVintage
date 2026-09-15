# 100 Cámaras Vintage — instrucciones de instalación (una sola vez)

Ya tenés cuenta de GitHub y GitHub Desktop instalado. Seguí estos pasos en orden,
en la compu de tu marido. Después de esto, vas a poder cargar productos nuevos
desde el celu para siempre, sin volver a tocar la compu.

## 1. Descomprimir esta carpeta

Descomprimí el .zip en cualquier lugar de la compu (por ejemplo el Escritorio).
Te va a quedar una carpeta llamada `site-repo` con todo adentro.

## 2. Crear el repositorio en GitHub Desktop

1. Abrí GitHub Desktop
2. Arriba a la izquierda: **File → Add local repository**
3. Elegí la carpeta `site-repo` que acabás de descomprimir
4. Si te dice "This directory does not appear to be a Git repository", tocá
   **"create a repository"** (van a aparecer como link azul en el mismo cartel)
5. Nombre del repositorio: `100camarasvintage-catalogo` (o el que quieras)
6. Tocá **"Create Repository"**

## 3. Subir todo a GitHub (Publish)

1. Arriba a la derecha vas a ver un botón que dice **"Publish repository"**
2. Destildá la opción "Keep this code private" si preferís que sea público
   (no importa para el funcionamiento, podés dejarlo privado tranquila)
3. Tocá **"Publish Repository"**
4. Esperá — son muchas fotos (~250 MB), puede tardar varios minutos según tu internet.
   No cierres la ventana hasta que termine.

## 4. Conectar Netlify con este repositorio

1. Andá a **app.netlify.com**, entrá al sitio `100camarasvintage-catalogo`
2. Andá a **Build & deploy → Continuous deployment** (la pantalla que vimos antes)
3. Tocá **"Link repository"**
4. Elegí **GitHub**, autorizá el acceso si te lo pide
5. Buscá y seleccioná el repositorio que acabás de crear
6. Branch: `main`
7. Build command: `npm run build` (probablemente ya aparezca solo, porque está
   en el archivo `netlify.toml`)
8. Publish directory: `.` (un punto — también debería completarse solo)
9. Tocá **"Deploy site"** o **"Save"**

Esperá unos minutos y refrescá tu sitio — debería verse igual que antes, pero
ahora conectado a GitHub.

## 5. Activar el panel de carga (Identity + Git Gateway)

1. En Netlify, andá a la sección **"Identity"** (menú de la izquierda, en General)
2. Tocá **"Enable Identity"**
3. Bajá hasta **"Registration"** y elegí **"Invite only"** (así nadie más que vos
   puede entrar al panel)
4. Bajá hasta **"Services" → "Git Gateway"** y tocá **"Enable Git Gateway"**

## 6. Invitarte a vos misma como usuaria

1. Seguís en la sección Identity → tocá **"Invite users"**
2. Escribí tu email
3. Te va a llegar un mail — abrilo (puede ser desde el celu) y tocá el link
4. Te va a pedir que crees una contraseña — usá una que recuerdes bien
5. ¡Listo! Ya sos usuaria del panel

## 7. Usar el panel desde el celu, para siempre

Andá a: **https://100camarasvintage-catalogo.netlify.app/admin**

Iniciá sesión con el email y contraseña que creaste. Ahí vas a poder:
- Ver los 209 productos organizados por categoría
- Editar precio, categoría, código, descripción y fotos de cualquiera
- Agregar productos nuevos (botón "New Producto"), sacando la foto directo
  desde el celu
- Guardar — el sitio se actualiza solo en 1 a 2 minutos

No hace falta volver a tocar la compu nunca más.

## Nota sobre el precio con error

El flash "Rollei Beta 4 Electronic Flash" tiene el precio cargado como
`$140.00.` en el catálogo original — parece un error de tipeo (¿$140.000?).
Lo dejé tal cual para no adivinar: entrá al panel y corregilo vos ahí, es
cuestión de tocar ese producto y cambiar el precio.

## Categorías asignadas automáticamente

Clasifiqué los 209 productos en Cámaras, Lentes, Flashes, Accesorios y Otros
según el título y la descripción de cada uno. Es un primer ordenamiento
automático — puede haber alguno mal categorizado (por ejemplo cámaras
compactas con un lente fijo, que a veces el sistema confunde con un lente
suelto). Revisalos con calma desde el panel y cambiá la categoría donde haga
falta; es un campo editable como cualquier otro.
