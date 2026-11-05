# Prévia navegável de categorias e subcategorias

Filmes aparece como nova categoria. A segunda linha abre Todas de Filmes, Ação,
Aventura, Filmes premiados, Heróis, Infantil e Terror. A coleção vazia é sinalizada
como em breve; não são usadas fotos de outras categorias como filmes fictícios.

Link de avaliação: `/pages/caneca-ceramica.html?categoria=filmes#escolha-arte`.
Também aceita `&subcategoria=acao`. Filtros inválidos voltam para opções válidas.
As 254 artes atuais e suas categorias permanecem disponíveis. Seleção, preview,
paginação e botões de compra respeitam o filtro pai/filho. Sem arte, compra bloqueada.

Contrato preparado para o frontend: `theme: 'filmes'`, `subcategory: 'acao'`.
A lista está isolada em `public/js/art-categories.js` para receber outras famílias
após aprovação do formato. Essa fase não importa pastas novas, não altera Neon
e não amplia a sincronização atual de Natal. A importação da estrutura completa
será implementada após confirmação dos nomes/caminhos no Cloudinary e aprovação.

Validação: teste dos filtros hierárquicos e verificação sintática. Conferir no
deploy o estado vazio, a mudança de gênero, retorno para Natal/Páscoa e mobile.
