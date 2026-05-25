import { useState } from 'react'
import {
  HelpCircle, Lock, KeyRound, Users, CalendarDays,
  Wallet, Settings, FileText, ChevronDown, ChevronUp,
  Heart, Download, Shield, Star,
} from 'lucide-react'
import styles from './HelpPage.module.css'

interface Topic {
  icon: React.ReactNode
  title: string
  color: string
  items: { q: string; a: string }[]
}

const TOPICS: Topic[] = [
  {
    icon: <Lock size={16}/>,
    title: 'Acesso ao sistema',
    color: 'var(--accent)',
    items: [
      {
        q: 'Como entro como psicóloga?',
        a: 'Na tela de login, selecione a aba "Psicóloga" e informe a senha de acesso. A senha padrão inicial é psico2025. Você pode alterá-la em Configurações → Senha de acesso.',
      },
      {
        q: 'Como minha paciente acessa o portal?',
        a: 'Cadastre a paciente em Pacientes → Novo paciente e defina um Código do portal (ex: MARIA2024). A paciente acessa em psicomoreira.vercel.app → aba "Sou paciente" e digita esse código.',
      },
      {
        q: 'O que a paciente vê no portal dela?',
        a: 'A paciente vê apenas: próxima sessão agendada, histórico de sessões (data, horário, status e se está pago). As notas clínicas, prontuário e observações são totalmente sigilosos — ela não vê nada disso.',
      },
    ],
  },
  {
    icon: <Users size={16}/>,
    title: 'Gerenciar pacientes',
    color: 'var(--purple)',
    items: [
      {
        q: 'Como cadastrar uma nova paciente?',
        a: 'Vá em Pacientes → botão "Novo paciente". Preencha nome, telefone e data de início do acompanhamento. Os demais campos são opcionais. Após salvar, você é redirecionado ao perfil da paciente.',
      },
      {
        q: 'Como alterar o status da paciente?',
        a: 'Dentro do perfil da paciente (clique no nome na lista), use o seletor no canto superior direito para mudar entre Ativo, Pausado ou Encerrado. Ao encerrar, a data de encerramento é registrada automaticamente.',
      },
      {
        q: 'O que é o Código do portal?',
        a: 'É uma senha personalizada que você cria para cada paciente acessar o portal dela. Pode ser qualquer combinação (ex: ANA2024, JOAO01). Fica visível no perfil da paciente e em Configurações.',
      },
    ],
  },
  {
    icon: <FileText size={16}/>,
    title: 'Sessões e prontuário',
    color: 'var(--teal)',
    items: [
      {
        q: 'Como registrar uma sessão realizada?',
        a: 'Clique em "Nova sessão" no menu lateral ou no botão dentro do perfil da paciente. Selecione a data, horário e mude o status para "Realizada". Preencha as notas clínicas — esses campos só aparecem quando o status é Realizada.',
      },
      {
        q: 'Que campos de prontuário existem?',
        a: 'Demanda/queixa apresentada, Estado emocional/humor, Intervenções realizadas, Notas clínicas gerais, Evolução/progresso, Objetivos para próxima sessão. Todos são opcionais e ficam 100% privados.',
      },
      {
        q: 'Como ver o histórico de sessões de uma paciente?',
        a: 'No perfil da paciente, clique na aba "Sessões". As sessões aparecem da mais recente para a mais antiga. Clique em qualquer sessão para expandir e ver as notas. Use o ícone de lápis para editar.',
      },
      {
        q: 'Como registrar uma falta ou cancelamento?',
        a: 'Crie a sessão normalmente e selecione o status "Falta" ou "Cancelada". Um campo de motivo aparece automaticamente. Faltas são contabilizadas no perfil da paciente.',
      },
    ],
  },
  {
    icon: <CalendarDays size={16}/>,
    title: 'Agenda',
    color: 'var(--blue)',
    items: [
      {
        q: 'Como usar a agenda?',
        a: 'A agenda mostra um calendário mensal. Dias com sessões têm pontinhos coloridos (azul = agendada, verde = realizada, vermelho = falta). Clique em um dia para ver as sessões daquele dia no painel lateral direito.',
      },
      {
        q: 'O que significam as cores na agenda?',
        a: 'Azul = sessão agendada, Verde = realizada, Vermelho = falta ou cancelada, Laranja = remarcada. No painel do dia, clique em uma sessão para editá-la.',
      },
    ],
  },
  {
    icon: <Wallet size={16}/>,
    title: 'Controle financeiro',
    color: 'var(--green)',
    items: [
      {
        q: 'Como registrar um pagamento recebido?',
        a: 'Na sessão (ao criar ou editar), marque a caixa "Pagamento recebido" e selecione a forma de pagamento (PIX, dinheiro, cartão, etc.). Você também pode ir em Financeiro → aba "Pendentes" e clicar em "Marcar pago" para qualquer sessão.',
      },
      {
        q: 'Como ver o resumo financeiro do mês?',
        a: 'Acesse Financeiro no menu lateral. O painel mostra Recebido, Pendente e Total faturado do mês selecionado. Use as setas para navegar entre meses. A aba Resumo mostra a tabela de sessões e o breakdown por forma de pagamento.',
      },
      {
        q: 'Como ver todos os pagamentos pendentes?',
        a: 'No Financeiro, clique na aba "Pendentes". Todos os pagamentos em aberto de todos os meses aparecem aqui. Você pode marcar como pago diretamente dessa tela.',
      },
      {
        q: 'Como definir o valor padrão das sessões?',
        a: 'Em Configurações → Padrões de atendimento → Valor padrão (R$). Esse valor preenche automaticamente o campo "Valor" ao criar uma nova sessão. Você pode alterar por sessão individualmente.',
      },
    ],
  },
  {
    icon: <Download size={16}/>,
    title: 'Backup e exportação',
    color: 'var(--amber)',
    items: [
      {
        q: 'Como fazer backup de todos os dados?',
        a: 'Vá em Configurações → seção Backup de dados → botão "Exportar JSON". Um arquivo psicomoreira-backup-YYYY-MM-DD.json será baixado com todos os seus pacientes, sessões e configurações.',
      },
      {
        q: 'Como restaurar um backup?',
        a: 'Em Configurações → seção Backup de dados → botão "Importar JSON". Selecione o arquivo de backup. Atenção: isso substitui todos os dados atuais pelo conteúdo do backup.',
      },
      {
        q: 'Com que frequência devo fazer backup?',
        a: 'Recomendamos semanalmente ou após cadastrar novas pacientes/sessões importantes. Os dados ficam no localStorage do navegador — se você limpar os dados do navegador, os dados são perdidos sem um backup.',
      },
      {
        q: 'O backup funciona em outro dispositivo?',
        a: 'Sim! Exporte o JSON em um dispositivo e importe em outro. Assim você migra todos os dados perfeitamente, inclusive para usar em outro navegador ou computador.',
      },
    ],
  },
  {
    icon: <Settings size={16}/>,
    title: 'Configurações',
    color: 'var(--text3)',
    items: [
      {
        q: 'Como alterar a senha de acesso?',
        a: 'Em Configurações → Dados profissionais → campo "Senha de acesso". Digite a nova senha (mínimo 4 caracteres) e clique em Salvar. A nova senha vale na próxima vez que você fizer login.',
      },
      {
        q: 'Como configurar os dias e horários de atendimento?',
        a: 'Em Configurações → Padrões de atendimento. Clique nos botões dos dias da semana para ativar/desativar. Defina o horário de início e fim do expediente. Isso é usado como referência visual na agenda.',
      },
    ],
  },
  {
    icon: <Shield size={16}/>,
    title: 'Privacidade e LGPD',
    color: 'var(--purple)',
    items: [
      {
        q: 'Onde ficam armazenados os dados?',
        a: 'Todos os dados ficam armazenados localmente no seu navegador (localStorage). Nenhuma informação é enviada para servidores externos ou terceiros. Somente você tem acesso.',
      },
      {
        q: 'As notas clínicas são sigilosas?',
        a: 'Sim. As notas clínicas (demanda, intervenções, evolução, etc.) nunca aparecem no portal da paciente. A paciente vê apenas data, horário, modalidade e status de pagamento das sessões.',
      },
      {
        q: 'Como o sistema está em conformidade com a LGPD?',
        a: 'Os dados sensíveis de saúde são armazenados apenas localmente no seu dispositivo, sem transmissão para terceiros. O acesso é protegido por senha (psicóloga) e código individual (paciente). Você pode excluir todos os dados a qualquer momento limpando o localStorage do navegador.',
      },
    ],
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export function HelpPage() {
  const [openTopic, setOpenTopic]   = useState<number | null>(0)
  const [openItem,  setOpenItem]    = useState<string | null>(null)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <HelpCircle size={22} strokeWidth={1.6}/>
        </div>
        <div>
          <h1 className={styles.title}>Central de Ajuda</h1>
          <p className={styles.sub}>Tudo que você precisa saber para usar o PsicoMoreira</p>
        </div>
      </div>

      {/* Quick cards */}
      <div className={styles.quickGrid}>
        <QuickCard icon={<Lock size={18}/>}       color="var(--accent)"  title="Psicóloga"  desc="Senha: psico2025 (altere em Configurações)"/>
        <QuickCard icon={<KeyRound size={18}/>}   color="var(--purple)"  title="Paciente"   desc="Código criado no cadastro da paciente"/>
        <QuickCard icon={<Download size={18}/>}   color="var(--amber)"   title="Backup"     desc="Configurações → Exportar JSON"/>
        <QuickCard icon={<Star size={18}/>}       color="var(--green)"   title="Dica"       desc="Faça backup semanal para não perder dados"/>
      </div>

      {/* Topic accordion */}
      <div className={styles.accordion}>
        {TOPICS.map((topic, ti) => (
          <div key={ti} className={styles.topicBlock}>
            <button
              className={`${styles.topicHeader} ${openTopic === ti ? styles.topicOpen : ''}`}
              onClick={() => setOpenTopic(openTopic === ti ? null : ti)}
            >
              <span className={styles.topicIcon} style={{ color: topic.color, background: `color-mix(in srgb, ${topic.color} 12%, transparent)` }}>
                {topic.icon}
              </span>
              <span className={styles.topicTitle}>{topic.title}</span>
              <span className={styles.topicCount}>{topic.items.length} tópicos</span>
              {openTopic === ti ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </button>

            {openTopic === ti && (
              <div className={styles.topicBody}>
                {topic.items.map((item, ii) => {
                  const key = `${ti}-${ii}`
                  const isOpen = openItem === key
                  return (
                    <div key={ii} className={styles.faqItem}>
                      <button
                        className={`${styles.faqQ} ${isOpen ? styles.faqQOpen : ''}`}
                        onClick={() => setOpenItem(isOpen ? null : key)}
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                      </button>
                      {isOpen && (
                        <p className={styles.faqA}>{item.a}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div className={styles.footer}>
        <Heart size={14} style={{ color: 'var(--accent)', flexShrink: 0 }}/>
        <p>
          <strong>PsicoMoreira</strong> — Sistema de gestão clínica para psicólogas.
          Desenvolvido com foco em privacidade, simplicidade e conformidade com a LGPD.
        </p>
      </div>
    </div>
  )
}

function QuickCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className={styles.quickCard}>
      <div className={styles.quickIcon} style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        {icon}
      </div>
      <div>
        <div className={styles.quickTitle}>{title}</div>
        <div className={styles.quickDesc}>{desc}</div>
      </div>
    </div>
  )
}
