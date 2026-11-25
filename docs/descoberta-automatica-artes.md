# Categorias automáticas do Cloudinary

Raiz autorizada e fixa: `Artize/Canecas ceramicas`.
O backend lista recursivamente as pastas dessa raiz pela Admin API, paginando
pastas e imagens. A primeira pasta é a categoria; pastas internas compõem a
subcategoria. Até seis níveis são aceitos; níveis internos aparecem agrupados
no segundo filtro. Máximo de 2000 pastas por operação. Não busca outras raízes.

Exemplo: `Artize/Canecas ceramicas/Funko/HARRY POTTER` vira categoria Funko e
subcategoria Harry potter. `Desenhos/BOB ESPONJA` vira Desenhos / Bob esponja.
O caminho de consulta mantém exatamente maiúsculas, acentos e espaços retornados
pelo Cloudinary. Nada é renomeado no Cloudinary ou nos arquivos do computador.

Os IDs internos normalizam acentos/case/pontuação. Funko, FUNKO ou funko usados
isoladamente produzem a mesma identidade, permitindo alterar só a capitalização
sem duplicar artes. Se duas pastas distintas no mesmo nível normalizarem para
a mesma identidade, a operação recusa a ambiguidade e preserva o catálogo salvo.
Evite manter, por exemplo, Funko e FUNKO simultaneamente dentro da mesma raiz.

O site formata o primeiro caractere em maiúsculo e os demais em minúsculo:
Harry potter, La casa de papel, Rick e morty. Não corrige grafia nem acrescenta
acentos ausentes do nome original. Pastas vazias não criam filtros novos: esses
filtros aparecem quando houver imagens sincronizadas. Fotos diretamente na raiz,
sem uma categoria, não são importadas. Fotos na pasta da categoria são aceitas
sem subcategoria. Nenhuma extensão de arquivo é presumida a partir dos nomes.

## Persistência e atualização

A tabela exclusiva de artes ganha um CHECK versionado para validar identidades
genéricas de categoria/subcategoria. A nova regra é validada antes de remover
as regras antigas conhecidas, em transação sob lock. Não remove tabelas, colunas,
registros nem altera estruturas de temas, paletas, pedidos ou usuários.

asset_id e IDs anteriores são preservados. O campo source_folder identifica a
pasta real. Uma primeira importação no deploy atualiza os registros antigos que
ainda não têm essa origem. Reinícios seguintes reutilizam o catálogo salvo.
Depois de concluir novos uploads, o administrador clica Sincronizar artes.
Novas categorias/subpastas dentro da raiz passam a aparecer sem editar o código.

Toda a descoberta e todas as páginas de imagens precisam concluir antes da
gravação. Falha, limite da API ou ambiguidade não permitem importação parcial.
Registros ausentes da resposta não são excluídos. O frontend constrói filtros
com texto seguro, mantendo os IDs das categorias originais e a galeria progressiva.
O carrossel da home recebe as novas imagens na próxima carga da página.

## Verificação

36 testes locais passaram (transporte de banco isolado, sem acesso externo):
descoberta, escopo, colisões, Unicode/case, labels, paginas independentes, falhas,
persistência, migração restrita e regressão de temas, filtros e carrossel.
Verificação real de importação e contagens é feita após o deploy.
Referência: https://cloudinary.com/documentation/admin_api#get_subfolders
