export type QuoteCategory =
  | "philosophy"
  | "biblical"
  | "literary"
  | "humor"
  | "product"
  | "wisdom";

export type Quote = {
  id: string;
  text: string;
  author?: string;
  source?: string;
  category: QuoteCategory;
};

export const QUOTES: Quote[] = [
  // Filosóficas (10)
  { id: "phi-1", text: "Conhece-te a ti mesmo.", author: "Sócrates", category: "philosophy" },
  { id: "phi-2", text: "Tornamo-nos aquilo que repetidamente fazemos.", author: "Aristóteles", category: "philosophy" },
  { id: "phi-3", text: "Penso, logo existo.", author: "Descartes", category: "philosophy" },
  { id: "phi-4", text: "Tudo flui, nada permanece.", author: "Heráclito", category: "philosophy" },
  { id: "phi-5", text: "A vida sem reflexão não merece ser vivida.", author: "Sócrates", category: "philosophy" },
  { id: "phi-6", text: "Não é o que te acontece, mas como você reage que importa.", author: "Epicteto", category: "philosophy" },
  { id: "phi-7", text: "Comece bem o dia e o dia se torna seu.", author: "Marco Aurélio", category: "philosophy" },
  { id: "phi-8", text: "A felicidade depende de nós mesmos.", author: "Aristóteles", category: "philosophy" },
  { id: "phi-9", text: "Tudo o que ouvimos é uma opinião, não um fato.", author: "Marco Aurélio", category: "philosophy" },
  { id: "phi-10", text: "A vida é breve. Não a desperdice.", author: "Sêneca", category: "philosophy" },

  // Bíblicas (8)
  { id: "bib-1", text: "Tudo tem o seu tempo determinado.", source: "Eclesiastes 3:1", category: "biblical" },
  { id: "bib-2", text: "Vale mais a paciência do que o orgulho.", source: "Eclesiastes 7:8", category: "biblical" },
  { id: "bib-3", text: "O temor do Senhor é o princípio do conhecimento.", source: "Provérbios 1:7", category: "biblical" },
  { id: "bib-4", text: "Alegrai-vos com os que se alegram, e chorai com os que choram.", source: "Romanos 12:15", category: "biblical" },
  { id: "bib-5", text: "A cada dia bastam os seus problemas.", source: "Mateus 6:34", category: "biblical" },
  { id: "bib-6", text: "Pedi, e dar-se-vos-á.", source: "Mateus 7:7", category: "biblical" },
  { id: "bib-7", text: "Tudo posso naquele que me fortalece.", source: "Filipenses 4:13", category: "biblical" },
  { id: "bib-8", text: "Em tudo dai graças.", source: "1 Tessalonicenses 5:18", category: "biblical" },

  // Literárias BR (8)
  { id: "lit-1", text: "Tenho em mim todos os sonhos do mundo.", author: "Fernando Pessoa", category: "literary" },
  { id: "lit-2", text: "Para ser grande, sê inteiro.", author: "Fernando Pessoa", category: "literary" },
  { id: "lit-3", text: "Quem ama, inventa as suas dores.", author: "Machado de Assis", category: "literary" },
  { id: "lit-4", text: "O segredo é o de aceitar o presente.", author: "Machado de Assis", category: "literary" },
  { id: "lit-5", text: "Navegar é preciso; viver não é preciso.", author: "Fernando Pessoa", category: "literary" },
  { id: "lit-6", text: "Tudo vale a pena se a alma não é pequena.", author: "Fernando Pessoa", category: "literary" },
  { id: "lit-7", text: "Quem evita o pequeno mal, salva-se do grande.", author: "Machado de Assis", category: "literary" },
  { id: "lit-8", text: "Cada qual seu cada qual.", author: "Machado de Assis", category: "literary" },

  // Humor leve (7)
  { id: "hum-1", text: "Quem ri por último, ri melhor.", category: "humor" },
  { id: "hum-2", text: "Bom humor é a saúde da alma.", category: "humor" },
  { id: "hum-3", text: "Rir é o melhor remédio.", category: "humor" },
  { id: "hum-4", text: "Trabalhar é bom; trabalhar feliz é melhor.", category: "humor" },
  { id: "hum-5", text: "Sorrir não custa nada, mas vale muito.", category: "humor" },
  { id: "hum-6", text: "Não é a felicidade que traz o sorriso; é o sorriso que traz a felicidade.", category: "humor" },
  { id: "hum-7", text: "A vida é uma comédia para quem pensa e tragédia para quem sente.", author: "Horace Walpole", category: "humor" },

  // Propaganda LaudoUSG (5)
  { id: "pro-1", text: "Já testou os atalhos do Generate? Economiza minutos por laudo.", category: "product" },
  { id: "pro-2", text: "Sabia que pode imprimir o laudo desta sala direto em folha A4?", category: "product" },
  { id: "pro-3", text: 'Dica: ditar "DUM 15/03/26" nos achados gera idade gestacional automática.', category: "product" },
  { id: "pro-4", text: "Sua frase padrão por categoria pode virar atalho — vá em Preferências do app.", category: "product" },
  { id: "pro-5", text: "Consultor IA está sempre disponível para dúvidas clínicas (PRO).", category: "product" },

  // Sabedoria/provérbios (12)
  { id: "wis-1", text: "Devagar e sempre.", category: "wisdom" },
  { id: "wis-2", text: "Toda jornada começa com um pequeno passo.", author: "Lao Tsé", category: "wisdom" },
  { id: "wis-3", text: "Plante hoje a árvore cuja sombra você quer no futuro.", category: "wisdom" },
  { id: "wis-4", text: "A persistência move montanhas.", category: "wisdom" },
  { id: "wis-5", text: "Águas calmas correm fundo.", category: "wisdom" },
  { id: "wis-6", text: "Não se constrói Roma em um dia.", category: "wisdom" },
  { id: "wis-7", text: "Mais vale uma palavra dita na hora certa que muitas tarde demais.", category: "wisdom" },
  { id: "wis-8", text: "Quem não arrisca, não petisca.", category: "wisdom" },
  { id: "wis-9", text: "Quem semeia colhe.", category: "wisdom" },
  { id: "wis-10", text: "O sol nasce para todos.", category: "wisdom" },
  { id: "wis-11", text: "A pressa é inimiga da perfeição.", category: "wisdom" },
  { id: "wis-12", text: "A simplicidade é a sofisticação máxima.", author: "Leonardo da Vinci", category: "wisdom" },
];
