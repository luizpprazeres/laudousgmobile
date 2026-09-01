-- O identificador MAMARIA permanece estável; somente o rótulo apresentado ao
-- usuário muda para refletir os três escopos: mamas, axilas ou ambos.
update public.categories
set label = 'Mamas e axilas'
where code = 'MAMARIA';
