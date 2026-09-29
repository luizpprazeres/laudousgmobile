# Aceite E2E mobile → Sala canônica

Status: NÃO EXECUTADO. Exige login normal na conta que Luiz confirmou ser exclusiva de testes. Não capturar senhas, tokens, telas de histórico alheio ou dados de pacientes.

## Procedimento por plataforma

Usar app do build atual, abrir novo exame sintético e identificá-lo apenas como demonstração QA. Criar uma sessão de Sala pelo próprio app e abrir o link retornado em sala.laudousg.com.br. Registrar somente host e resultado; não incluir código/link de sessão no relatório público.

Gerar laudo de abdome com achados fictícios. Enviar pelo fluxo do app e verificar correspondência do texto na Sala. Antes de aprovação médica explícita, a Sala deve exibir estado pendente, sem selo de revisado. Aprovar a versão pela ação “Revisado — liberar para a Sala”; confirmar que a Sala mostra a mesma versão como revisada. Editar o texto no app, aguardar gravação e confirmar que a aprovação anterior deixa de valer. Revisar novamente e confirmar recuperação do estado revisado. Se houver conflito, o app deve pedir nova conferência, nunca aprovar silenciosamente.

Criar um segundo exame sintético e verificar navegação anterior/próximo, leitura vertical e preservação da seleção quando chega novo laudo. Identificação opcional da auxiliar deve ficar local e não aparecer na cópia do laudo. Acréscimos da auxiliar precisam permanecer distintos da revisão médica.

Abrir o mesmo caminho pelo host antigo e comprovar chegada ao novo host sem perder sessão. Não alterar relógio, permissões ou dados de produção para forçar expiração; expiração já tem testes locais dedicados, e o E2E deve registrar o que realmente foi observado.

## Evidência de conclusão

Para iOS e Android separadamente: build/commit, versão do SO, data, ações executadas, resultados pendente→revisado→pendente→revisado, correspondência do texto e observações de falha. Capturas devem conter somente dados sintéticos e omitir códigos de acesso. Build, typecheck, mocks e HTTP401 não substituem este aceite autenticado.
