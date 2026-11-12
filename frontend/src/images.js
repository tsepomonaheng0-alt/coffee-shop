// Loads every file in src/image so components can reference them by file name
// (keeps ../image/... paths in css/style.css working unchanged).
const files = import.meta.glob('./image/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

const images = {};
for (const path in files) {
  images[path.replace('./image/', '')] = files[path];
}

export default images;
