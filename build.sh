#!/bin/bash
set -e

echo "🔧 Instalando Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
source $HOME/.cargo/env

echo "🦀 Instalando wasm-pack..."
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- -f

echo "📦 Compilando WASM..."
~/.cargo/bin/wasm-pack build --target web

echo "📁 Preparando arquivos finais..."
mkdir -p public
cp -r pkg/* public/
cp index.html public/ 2>/dev/null || echo "⚠️ index.html não encontrado, criando um básico..."

# Cria index.html se não existir
if [ ! -f public/index.html ]; then
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Agenda da Turma - Rust 🦀</title>
</head>
<body>
    <h1>🚀 AGENDA RUST FUNCIONANDO NA VERCEL! 🎉</h1>
    <p>Isso aqui é puro suco de determinação!</p>
    
    <script type="module">
        import init from './agenda_rust.js';
        await init();
        console.log('✅ RUST WASM CARREGADO!');
        alert('RUST NA VERCEL - FUNCIONOU CARALHO!');
    </script>
</body>
</html>
EOF
fi

echo "✅ BUILD COMPLETO!"
