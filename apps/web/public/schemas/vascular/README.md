# Cartografia venosa — base de quatro vistas

A web reutiliza a mesma base anatômica revisada e as mesmas coordenadas do aplicativo. O desenho apresenta vistas lateral, anterior, medial e posterior de cada membro inferior.

O PNG é somente a base de apresentação. A fonte de verdade continua sendo o `MapaVenoso` estruturado do pacote `@laudousg/schemes`. O navegador recolore apenas os segmentos correspondentes aos achados informados e gera a saída final para PNG, PDF ou Sala.

Nesta entrega 20A entram a base, a projeção determinística dos segmentos e o contrato de exportação. Distância de perfurantes, referência pela planta do pé ou ponto J, níveis de Cockett e sincronização bidirecional fina pertencem à 20B.

A categoria não será exibida na estação web antes de `DOPPLER_VENOSO_MMII` ter formulário e renderer oficialmente ligados à web. Isso evita um desenho utilizável ao lado de um laudo clínico incompleto.
