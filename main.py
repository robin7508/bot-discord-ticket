import os
import discord
from discord.ext import commands

# ================= TOKEN (Railway) =================
TOKEN = os.getenv("DISCORD_TOKEN")

# ================= CONFIG =================
CANAL_PAINEL_ID = 1458976664548806737
CATEGORIA_TICKET_ID = 1458975991341781288
CARGO_CLIENTE_ID = 1457166675479625799
CARGO_AUTORIZADO_ID = 1432553894910758925

PRODUTOS = {
    "Netflix Infinita": 20.00,
    "Painel Otimização": 45.00,
    "Spotify Trimestral": 70.00,
    "X86 Sem TP": 10.00,
    "IA que Cria Cheat": 5.00,
    "Curso Criação de Cheat": 25.00,
    "Curso SS": 15.00
}

# ================= INTENTS =================
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

# ================= UTIL =================

def tem_ticket_aberto(guild, user):
    categoria = guild.get_channel(CATEGORIA_TICKET_ID)
    if not categoria:
        return None

    for canal in categoria.text_channels:
        if canal.name == f"ticket-{user.id}":
            return canal
    return None

def tem_cargo_autorizado(member):
    return any(role.id == CARGO_AUTORIZADO_ID for role in member.roles)

# ================= SELECT =================

class ProdutoSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(
                label=nome,
                description=f"R$ {preco:.2f}",
                emoji="🛒"
            )
            for nome, preco in PRODUTOS.items()
        ]

        super().__init__(
            placeholder="Selecione um produto...",
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        user = interaction.user

        ticket = tem_ticket_aberto(guild, user)
        if ticket:
            await interaction.followup.send(
                f"❌ Você já tem um ticket aberto: {ticket.mention}",
                ephemeral=True
            )
            return

        produto = self.values[0]
        preco = PRODUTOS[produto]
        categoria = guild.get_channel(CATEGORIA_TICKET_ID)

        canal = await guild.create_text_channel(
            name=f"ticket-{user.id}",
            category=categoria,
            overwrites={
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                user: discord.PermissionOverwrite(view_channel=True, send_messages=True),
                guild.me: discord.PermissionOverwrite(view_channel=True)
            }
        )

        embed = discord.Embed(
            title="🎫 Ticket de Compra",
            description=(
                f"👤 **Cliente:** {user.mention}\n"
                f"📦 **Produto:** `{produto}`\n"
                f"💰 **Valor:** `R$ {preco:.2f}`\n\n"
                f"⏳ Aguarde um **STAFF** para confirmar."
            ),
            color=discord.Color.orange()
        )

        await canal.send(embed=embed, view=TicketView())

        await interaction.followup.send(
            f"✅ Ticket criado: {canal.mention}",
            ephemeral=True
        )

# ================= VIEW PAINEL =================

class PainelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(ProdutoSelect())

# ================= BOTÕES TICKET =================

class TicketView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="✅ Confirmar compra", style=discord.ButtonStyle.success)
    async def confirmar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not tem_cargo_autorizado(interaction.user):
            await interaction.response.send_message(
                "❌ Apenas a STAFF pode confirmar compras.",
                ephemeral=True
            )
            return

        cargo = interaction.guild.get_role(CARGO_CLIENTE_ID)
        if cargo and cargo not in interaction.user.roles:
            await interaction.user.add_roles(cargo)

        await interaction.response.send_message(
            "🎉 Compra confirmada! Cargo entregue.",
            ephemeral=True
        )

    @discord.ui.button(label="🗑️ Finalizar ticket", style=discord.ButtonStyle.danger)
    async def finalizar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not tem_cargo_autorizado(interaction.user):
            await interaction.response.send_message(
                "❌ Apenas a STAFF pode finalizar tickets.",
                ephemeral=True
            )
            return

        await interaction.response.send_message(
            "🗑️ Ticket finalizado.",
            ephemeral=True
        )
        await interaction.channel.delete()

# ================= READY =================

@bot.event
async def on_ready():
    print(f"✅ Bot online como {bot.user}")

    bot.add_view(PainelView())
    bot.add_view(TicketView())

    canal = bot.get_channel(CANAL_PAINEL_ID)
    if not canal:
        print("❌ Canal do painel não encontrado")
        return

    embed = discord.Embed(
        title="⚡ PAINEL DE COMPRAS",
        description="Selecione um produto abaixo para abrir seu ticket",
        color=discord.Color.blurple()
    )

    await canal.send(embed=embed, view=PainelView())

# ================= START =================

if TOKEN is None:
    print("❌ ERRO: DISCORD_TOKEN não configurado no Railway")
else:
    bot.run(TOKEN)
