const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  AttachmentBuilder
} = require("discord.js");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  const canal = client.channels.cache.get(config.canalPainel);
  if (!canal) return console.log("❌ Canal do painel não encontrado");

  const embed = new EmbedBuilder()
    .setTitle("🎫 Abrir Ticket - Adquirir Edit")
    .setDescription(`
Tem interesse em adquirir uma edit? Abra já um ticket!

• Atendimento eficiente
• Edit de qualidade
• Entrega rápida

Aproveite e faça sua compra com facilidade, e um atendimento único.
`)
    .setColor("Blue");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("menu_ticket")
    .setPlaceholder("Clique aqui para abrir um ticket")
    .addOptions([
      { label: "Suporte", value: "suporte", emoji: "🎧" },
      { label: "Adquirir Edit", value: "edit", emoji: "🛒" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);
  await canal.send({ embeds: [embed], components: [row] });
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    const tipo = interaction.values[0];
    const nome = `${tipo}-${interaction.user.username}`;

    const existente = interaction.guild.channels.cache.find(c => c.name === nome);
    if (existente)
      return interaction.reply({ content: "❌ Você já possui um ticket aberto.", ephemeral: true });

    const canal = await interaction.guild.channels.create({
      name: nome,
      type: ChannelType.GuildText,
      parent: config.categoriaTickets,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...(interaction.guild.roles.cache.get(config.cargoStaff)?.position < interaction.guild.members.me.roles.highest.position
          ? [{ id: config.cargoStaff, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }]
          : []),
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embedTicket = new EmbedBuilder()
      .setTitle("🎫 TICKET ABERTO")
      .setDescription(`
👋 **Bem-vindo ao canal oficial de atendimento do servidor**

🎯 Você solicitou atendimento na opção **${tipo}**

📢 Todos os responsáveis já estão cientes do atendimento,  
descreva com o máximo de detalhes possíveis o motivo do contato.

⏳ Evite chamar alguém via DM, basta aguardar que alguém irá lhe atender.

📕 Caso desejar sair do atendimento use o botão **Sair Ticket**
`)
      .setColor("Red");

    const finalizar = new ButtonBuilder()
      .setCustomId("finalizar_ticket")
      .setLabel("Finalizar Ticket")
      .setStyle(ButtonStyle.Success);

    const renomear = new ButtonBuilder()
      .setCustomId("renomear_ticket")
      .setLabel("Renomear Canal")
      .setStyle(ButtonStyle.Secondary);

    const adicionar = new ButtonBuilder()
      .setCustomId("add_user")
      .setLabel("Adicionar usuário")
      .setStyle(ButtonStyle.Secondary);

    const sair = new ButtonBuilder()
      .setCustomId("sair_ticket")
      .setLabel("Sair Ticket")
      .setStyle(ButtonStyle.Danger);

    const rowButtons = new ActionRowBuilder().addComponents(finalizar, renomear, adicionar, sair);
    const cargoMention = `<@&1478408649318862990>`;

    await canal.send({
      content: `${interaction.user} ${cargoMention}`,
      embeds: [embedTicket],
      components: [rowButtons]
    });

    return interaction.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
  }

  if (interaction.isButton()) {
    if (interaction.customId === "finalizar_ticket") {
      interaction.reply("🔒 Ticket será fechado em 5 segundos");

      // Transcript em memória
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      let transcript = `Transcript do ticket: ${interaction.channel.name}\n\n`;
      messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).forEach(m => {
        transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
      });

      const attachment = new AttachmentBuilder(Buffer.from(transcript, "utf-8"), {
        name: `ticket-${interaction.channel.name}.txt`
      });

      // Envia no canal de logs
      const logs = interaction.guild.channels.cache.get(config.canalLogs);
      if (logs) {
        const embedLog = new EmbedBuilder()
          .setTitle("📥 Ticket Finalizado")
          .setDescription(`O ticket **${interaction.channel.name}** foi finalizado por ${interaction.user.tag}`)
          .setColor("DarkRed")
          .setTimestamp();
        logs.send({ embeds: [embedLog], files: [attachment] });
      }

      setTimeout(() => interaction.channel.delete(), 5000);
    }

    if (interaction.customId === "sair_ticket") {
      interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false });
      interaction.reply({ content: "Você saiu do ticket.", ephemeral: true });
    }

    if (interaction.customId === "renomear_ticket") {
      interaction.channel.setName(`ticket-${Date.now()}`);
      interaction.reply({ content: "Canal renomeado.", ephemeral: true });
    }

    if (interaction.customId === "add_user") {
      interaction.reply({ content: "Marque o usuário que deseja adicionar ao ticket.", ephemeral: true });
    }
  }
});

client.login(config.token);