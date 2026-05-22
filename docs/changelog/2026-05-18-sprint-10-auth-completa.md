---
slug: sprint-10-auth-completa
title: "Autenticação completa — esqueci senha, perfil, excluir conta"
date: 2026-05-18
status: shipped
size: medium
tags: [ios, auth, lgpd, supabase, app-store]
sprint: S10
files_touched: 9
---

## Resumo (leigo)

Esta sprint fechou o ciclo de "ter conta" no app. Antes dela, dava pra criar conta e logar — só. Agora você consegue, também:

- **Esqueci minha senha**: digita o email, recebe um link, redefine a senha
- **Editar meu perfil**: muda nome, foto, dados do CRM
- **Excluir minha conta**: opção de fim de linha, removendo todos os seus dados

A última é exigência da Apple e da LGPD: todo app que armazena dados de usuário tem que oferecer um botão de "apagar tudo". Não é só formalidade — é direito seu.

## Detalhes (técnico)

3 telas novas em `Features/Auth/`: `ForgotPasswordView`, `ResetPasswordView`, `EditProfileView`. `AccountSettingsView` com botão "Excluir conta" (confirm dialog + delete cascade).

Backend: `DELETE /api/me/delete-account` apaga `user_profiles`, `generations`, `user_phrases`, `sala_sessions` em transação. Auth Supabase fluxo redirect via universal link `com.laudousg.LaudoUSG://reset-password?token=...`.

`AuthService.swift` expandido com `requestPasswordReset()`, `updateProfile()`, `deleteAccount()`. Logout automático após delete. Compliance App Store Guideline 5.1.1(v) + LGPD Art. 18.

## Impacto & Próximos passos

App agora atende requisitos de submit pra App Store (Guideline 5.1.1). Próximos passos: testes E2E mais profundos antes de submit + Sprint 11 com Termos de Uso + Política de Privacidade + Disclaimer expandido (App Store hygiene Parte 2).
