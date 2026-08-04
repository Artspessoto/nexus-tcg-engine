export const TRANSLATIONS = {
  "pt-br": {
    menu: {
      title: "TOON CASTLE",
      select_diff: "Selecione a Dificuldade:",
      start: "INICIAR JOGO",
      guide: "GUIA",
      easy: "Fácil",
      medium: "Médio",
      hard: "Difícil",
      tutorial: "TUTORIAL",
    },
    tutorial: {
      step_1:
        "Bem-vindo ao Toon Castle, desafiante! Antes de você encarar os perigos reais do castelo, vamos conhecer os fundamentos básicos do duelo. Preste atenção aos recursos.",
      step_1b:
        "Agora se você não é novo por aqui, se já conhece as regras ou quer voltar ao menu, clique no botão 'PULAR' no topo da tela. Agora vamos começar!",
      step_2:
        "Este são seus pontos de vida (LP). Se chegar a zero, você perde o duelo!",
      step_3:
        "E aqui está a sua mana/energia disponível para jogar as cartas no campo.",
      step_4:
        "Este é o seu deck. Você possui 20 cartas e compra uma a cada turno. Se suas cartas acabarem, você sofre um 'Deck Out' e perde a partida.",
      step_5:
        "Você inicia o duelo com 5 cartas do seu deck, mas atenção: o limite da sua mão é 6. As cartas são divididas em 4 classes: monstro, monstro de efeito, magia e armadilha.",
      step_5a:
        "Esta é uma Carta de Monstro. Ela possui pontos de Ataque (ATK) e Defesa (DEF). Você pode invocá-la no campo em Modo de Ataque (face para cima) ou em Modo de Defesa (face para baixo).",
      step_5b:
        "Este é um Monstro de Efeito. Ele é invocado da mesma forma que um monstro normal, porém possui uma habilidade especial que pode ser ativada no turno seguinte à sua invocação.",
      step_5c:
        "Esta é uma Carta Mágica. Elas causam efeito direto no oponente ou em cartas do campo! Podem ser de ativação rápida direto da mão ou ativadas no campo durante a sua Fase Principal (mas nunca na Fase de Batalha).",
      step_5d:
        "Esta é uma Carta Armadilha. Ela não tem ativação rápida. Você precisa baixá-la no campo (com a face para baixo) e só poderá ativá-la no turno seguinte, seja na Fase Principal ou durante a Batalha, para surpreender o oponente!",
      step_6:
        "Agora vamos para o campo de batalha, nele tem os espaços para invocar suas cartas e a zona de cemitério.",
      step_6a:
        "Aqui é onde fica localizado a zona de monstros, onde tem um limite de 3 invocações (tanto para monstros comuns quanto de efeito)",
      step_6b:
        "Aqui é a zona de cartas de feitiço, onde você pode colocar cartas mágicas ou armadilhas, mas atenção: para ativar uma carta mágica da mão, precisa ter um espaço disponível na zona.",
      step_6c:
        "A zona de cemitério é onde as cartas usadas e destruídas em combate e/ou por efeito são enviadas.",
      step_7:
        "Este é o seu Controle de Fases. Cada turno no duelo é dividido em etapas, e você usará este botão para avançar entre elas.",
      step_7a:
        "Normalmente, o turno começa na Fase de Compra (DRAW). Para puxar sua carta, você deve clicar diretamente sobre o seu Deck ou apertar a tecla ESPAÇO.",
      step_7b:
        "Mas atenção à regra: para manter o duelo justo, quem joga o primeiro turno da partida não compra carta, começando direto na Fase Principal (MAIN)",
      step_7c:
        "A Fase Principal é o seu momento de preparação: é apenas nela que você pode invocar monstros, ativar mágicas e baixar suas armadilhas no campo.",
      step_7d:
        "Depois de se preparar, você avança para a Fase de Batalha (BATTLE), onde seus monstros atacam!",
      step_7e:
        "Quando terminar, basta clicar novamente para passar o turno para o oponente.",
      next_btn: "PRÓXIMO",
      menu_btn: "VOLTAR AO MENU",
      play_btn: "JOGAR AGORA",
      skip_btn: "PULAR TUTORIAL",
    },
    guide: {
      title: "A ASCENSÃO DA TORRE",
      lore:
        "O Toon Castle não é apenas uma fortaleza; é uma prova de vontade. \n\n" +
        "Dizem que no topo da torre, a realidade se molda aos desejos do vencedor. " +
        "Mas o caminho é guardado por sentinelas que não conhecem a piedade.",
      rules:
        "- Avance andar por andar derrotando os guardiões.\n" +
        "- Suas cartas são o único vínculo com o mundo exterior.\n" +
        "- A derrota significa o retorno ao chão frio da entrada.",
      details:
        "- Cada carta tem Ataque e Defesa.\n• Ganha quem reduzir o HP do oponente a zero.\n• Escolha bem sua dificuldade!",
      footer: "O destino aguarda no topo",
      close: "FECHAR",
    },
    name_scene: {
      title: "Digite seu nome",
      warnings: {
        empty_name: "O nome não pode ficar vazio!",
        too_long_name: "O nome deve ter no máximo {max} letras.",
      },
      confirm: "CONFIRMAR",
      back_to_menu: "VOLTAR AO MENU",
      back: "VOLTAR",
    },
    pause_scene: {
      paused: "PAUSADO",
      resume: "RETOMAR",
    },
    deck_preview: {
      title: "PREPARAÇÃO DE BATALHA",
      subtitle: "Revisando as cartas de {name}",
      cards: "CARTAS",
      start_duel: "INICIAR DUELO",
      labels: {
        all: "TODOS",
        mana: "MANA",
        monster: "MONSTRO",
        effect_monster: "MONSTRO EFEITO",
        spells: "MAGIAS",
        traps: "ARMADILHAS",
      },
    },
    battle_scene: {
      opponent: "OPONENTE",
      draw_phase: "ESPAÇO: COMPRAR CARTA | ARRASTE PARA JOGAR",
      opponent_draw: "FASE DE COMPRA DO OPONENTE",
      main_phase: "FASE PRINCIPAL",
      battle_phase: "FASE DE BATALHA",
      turn_ended: "FIM DO TURNO",
      zone_occupied: "ZONA JÁ OCUPADA",
      insufficient_mana: "MANA INSUFICIENTE",
      turn_label: "TURNO",
      revive: "REVIVER",
      win_battle: "VITÓRIA!",
      lose_battle: "DERROTA!",
      battle_buttons: {
        to_battle: "INICIAR BATALHA",
        end_turn: "ENCERRAR TURNO",
        details: "DETALHES",
        active: "ATIVAR",
        set: "BAIXAR",
        attack: "ATACAR",
        change_pos: "MUDAR POS.",
        flip: "VIRAR",
        back_to_menu: "VOLTAR AO MENU",
        surrender: "DESISTIR",
        rematch: "TENTAR NOVAMENTE",
        next_duel: "AVANÇAR",
      },
      card_types: {
        MONSTER: "MONSTRO",
        SPELL: "MAGIA",
        TRAP: "ARMADILHA",
        EFFECT_MONSTER: "MONSTRO DE EFEITO",
      },
      combat_notices: {
        select_attack_target: "SELECIONE O ALVO DO ATAQUE",
        invalid_own_card: "VOCÊ NÃO PODE ATACAR SUAS PRÓPRIAS CARTAS!",
        direct_attack: "ATAQUE DIRETO",
      },
      effect_notices: {
        select_target: "SELECIONE O ALVO",
        invalid_target: "ALVO INVÁLIDO",
        no_target_type_found: "ESTE CEMITÉRIO NÃO POSSUI {type}!",
        no_valid_graveyard: "NENHUM ALVO VÁLIDO NO CEMITÉRIO",
        select_graveyard: "SELECIONE UM CEMITÉRIO",
        action_canceled: "AÇÃO CANCELADA",
        field_full: "CAMPO CHEIO!",
        response_title: "JANELA DE RESPOSTA",
        response_message:
          "Um ataque foi declarado. Deseja ativar um card ou efeito?",
        confirm_btn: "ATIVAR",
        cancel_btn: "NÃO",
        select_valid_response: "SELECIONE UM CARD OU EFEITO PARA ATIVAR",
      },
    },
  },
  en: {
    menu: {
      title: "TOON CASTLE",
      select_diff: "Select Difficulty:",
      start: "START GAME",
      guide: "GUIDE",
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      tutorial: "TUTORIAL",
    },
    tutorial: {
      step_1:
        "Welcome to Toon Castle, challenger! Before you face the real dangers of the castle, let's go over the basics of dueling. Keep an eye on your resources.",
      step_1b:
        "If you're not new around here, already know the rules, or just want to head back to the menu, hit the 'SKIP' button at the top of the screen. Now, let's get started!",
      step_2:
        "These are your Life Points (LP). If they hit zero, you lose the duel!",
      step_3:
        "And here's your available mana/energy for playing cards on the field.",
      step_4:
        "This is your deck. You have 20 cards and draw one every turn. If you run out of cards, you 'Deck Out' and lose the match.",
      step_5:
        "You start the duel with 5 cards, but pay attention: your hand limit is 6. Cards are divided into 4 types: Monster, Effect Monster, Spell, and Trap.",
      step_5a:
        "This is a Monster Card. It has Attack (ATK) and Defense (DEF) points. You can summon it to the field in Attack Mode (face-up) or Defense Mode (face-down).",
      step_5b:
        "This is an Effect Monster. It's summoned just like a normal monster, but it has a special ability you can activate on the turn after it's summoned.",
      step_5c:
        "This is a Spell Card. They have a direct impact on the opponent or cards on the field! They can be quick-played straight from your hand or activated on the field during your Main Phase (but never in the Battle Phase).",
      step_5d:
        "This is a Trap Card. It doesn't have a quick activation. You need to set it on the field (face-down) and you can only activate it on the next turn, either in the Main Phase or during Battle, to surprise your opponent!",
      step_6:
        "Now let's head to the battlefield. It contains the spaces to summon your cards and the graveyard zone.",
      step_6a:
        "This is the monster zone, which has a limit of 3 summons (for both normal and effect monsters).",
      step_6b:
        "This is the spell card zone, where you can place magic or trap cards. But pay attention: to activate a spell card from your hand, you must have an available space in this zone.",
      step_6c:
        "The graveyard zone is where cards that are used, destroyed in battle, and/or sent by effects end up.",
      step_7:
        "This is your Phase Control. Each turn in the duel is divided into phases, and you'll use this button to advance through them.",
      step_7a:
        "Normally, a turn starts in the Draw Phase (DRAW). To draw your card, you must click directly on your Deck or press the SPACEBAR.",
      step_7b:
        "But pay attention to this rule: to keep the duel fair, the player who goes first doesn't draw a card, starting straight in the Main Phase (MAIN).",
      step_7c:
        "The Main Phase is your preparation time: this is the only phase where you can summon monsters, activate spells, and set your traps on the field.",
      step_7d:
        "After preparing, you advance to the Battle Phase (BATTLE), where your monsters attack!",
      step_7e:
        "Once you're done, simply click the button again to pass the turn to your opponent.",
      next_btn: "NEXT",
      menu_btn: "BACK TO MENU",
      play_btn: "PLAY NOW",
      skip_btn: "SKIP TUTORIAL",
    },
    guide: {
      title: "THE TOWER ASCENSION",
      lore:
        "Toon Castle is not just a fortress; it is a test of will. \n\n" +
        "They say at the top of the tower, reality molds to the victor's desires. " +
        "But the path is guarded by sentinels who know no mercy.",
      rules:
        "- Advance floor by floor defeating the guardians.\n" +
        "- Your cards are the only link to the outside world.\n" +
        "- Defeat means returning to the cold floor of the entrance.",
      details:
        "- Each card has Attack and Defense.\n• Winner is whoever reduces the opponent's HP to zero.\n• Choose your difficulty wisely!",
      footer: "Destiny awaits at the top",
      close: "CLOSE",
    },
    name_scene: {
      title: "Enter your name",
      warnings: {
        empty_name: "Name cannot be empty!",
        too_long_name: "Name cannot exceed {max} characters",
      },
      confirm: "CONFIRM",
      back_to_menu: "BACK TO MENU",
      back: "BACK",
    },
    pause_scene: {
      paused: "PAUSED",
      resume: "RESUME",
    },
    deck_preview: {
      title: "BATTLE PREPARATION",
      subtitle: "Reviewing {name}'s cards",
      cards: "cards",
      start_duel: "START DUEL",
      labels: {
        all: "ALL",
        mana: "MANA",
        monster: "MONSTER",
        effect_monster: "EFFECT M.",
        spells: "SPELLS",
        traps: "TRAPS",
      },
    },
    battle_scene: {
      opponent: "OPPONENT",
      draw_phase: "SPACE: DRAW CARD | DRAG TO PLAY",
      opponent_draw: "OPPONENT'S DRAW PHASE",
      main_phase: "MAIN PHASE",
      battle_phase: "BATTLE PHASE",
      turn_ended: "TURN ENDED",
      zone_occupied: "ZONE ALREADY OCCUPIED",
      insufficient_mana: "INSUFFICIENT MANA",
      turn_label: "TURN",
      revive: "REVIVE",
      win_battle: "YOU WIN!",
      lose_battle: "YOU LOSE!",
      battle_buttons: {
        to_battle: "START BATTLE",
        end_turn: "END TURN",
        details: "DETAILS",
        active: "ACTIVATE",
        set: "SET",
        attack: "ATTACK",
        change_pos: "CHANGE POS.",
        flip: "FLIP",
        back_to_menu: "BACK TO MENU",
        surrender: "SURRENDER",
        rematch: "REMATCH",
        next_duel: "NEXT DUEL",
      },
      card_types: {
        MONSTER: "MONSTER",
        SPELL: "SPELL",
        TRAP: "TRAP",
        EFFECT_MONSTER: "EFFECT MONSTER",
      },
      combat_notices: {
        select_attack_target: "SELECT THE ATTACK TARGET",
        invalid_own_card: "YOU CANNOT ATTACK YOUR OWN CARDS!",
        direct_attack: "DIRECT ATTACK",
      },
      effect_notices: {
        select_target: "SELECT THE TARGET",
        invalid_target: "INVALID TARGET",
        no_target_type_found: "NO {type} IN THIS GRAVEYARD!",
        no_valid_graveyard: "NO VALID TARGETS IN GRAVEYARD",
        select_graveyard: "SELECT A GRAVEYARD",
        action_canceled: "ACTION CANCELED",
        field_full: "FIELD FULL!",
        response_title: "RESPONSE WINDOW",
        response_message:
          "An attack has been declared. Would you like to activate a card or effect?",
        confirm_btn: "ACTIVATE",
        cancel_btn: "NO",
        select_valid_response: "SELECT A CARD OR EFFECT TO ACTIVATE",
      },
    },
  },
};
