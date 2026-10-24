/**
 * Every word shown in the Community. English only for now: these are written to be translated by
 * a person who understands the situation, not by machine. To add a language, mirror this object.
 */

/** Where "Leave quickly" sends the browser. Choose something ordinary and unremarkable. */
export const QUICK_EXIT_URL = "https://www.google.com/";

/**
 * Helplines shown privately when someone writes something that suggests they may harm themselves.
 * Left EMPTY on purpose: numbers must be checked by the team (and a helpline partner) before they
 * are added. When empty, only the general safety message below is shown.
 */
export const HELPLINES: Array<{ name: string; detail: string }> = [];

export const copy = {
  brand: "Community",
  nav: { community: "Community" },

  entry: {
    eyebrow: "Traceveil Community",
    title: "You are not the only one this has happened to.",
    lead:
      "A private place to talk with others who have been through it. Share what you want to, read quietly if you prefer, and find out what has helped people like you.",
    promises: [
      { title: "No real name needed", body: "You get a calm, made-up name. We never ask who you are, and you do not need an email address." },
      { title: "Everyone in the room can read", body: "There are no private messages here. That keeps scammers and people who want to harm you away." },
      { title: "Text only", body: "No images or videos can be shared, so nothing from your situation can be passed around here." },
      { title: "People look after it", body: "Reports go to a real person. You can report any message in two taps." },
    ],
    signIn: "Sign in",
    join: "Join the Community",
    closedNotice: "The Community is being opened gradually. You can join and read announcements and the quiet room now. Conversation rooms will open once the moderation team is in place.",
    adultsOnly: "For people aged 18 and over.",
    notAdviceTitle: "A note on advice",
    notAdvice: "Members support each other with their own experience. Nothing here is legal, medical or mental health advice.",
  },

  join: {
    createTitle: "Join the Community",
    createLead: "We will make you a private sign-in. There is no email and no real name.",
    ageLabel: "I am 18 years old or older.",
    passwordLabel: "Add a password (optional)",
    passwordHint: "A password lets you sign in without typing your recovery phrase. Use at least 8 characters.",
    create: "Create my private sign-in",
    haveAccount: "I already have a sign-in",
    signInTitle: "Welcome back",
    signInLead: "Use the handle you were given and your recovery phrase (or your password, if you set one).",
    handle: "Your handle",
    secret: "Recovery phrase or password",
    signIn: "Sign in",
    newHere: "I am new here",
    lockedHint: "Too many unsuccessful tries. Please wait a few minutes.",
  },

  recovery: {
    title: "Save your sign-in now",
    lead: "This is the only time we can show your recovery phrase. We store it in a scrambled form, so we cannot show it again or recover it for you.",
    handle: "Your handle",
    phrase: "Your recovery phrase",
    reveal: "Show my recovery phrase",
    hide: "Hide",
    copy: "Copy both",
    copied: "Copied",
    download: "Save as a text file",
    safetyNote: "Keep it somewhere only you can reach. If someone else sees it, they can sign in as you.",
    confirm: "I have saved my handle and recovery phrase",
    continue: "Continue",
  },

  onboarding: {
    eyebrow: "Before you go in",
    title: "Choose how you appear",
    lead: "This is the only name other people see. You can change it any time.",
    nameLabel: "Your name here",
    nameHint: "Letters, numbers, spaces and hyphens. Please do not use your real name.",
    shuffle: "Suggest another",
    rulesTitle: "Four things we ask of everyone",
    rules: [
      { title: "Be kind", body: "Do not blame anyone for what happened or for how they responded." },
      { title: "Protect privacy", body: "Do not share real names, phone numbers, addresses, or links to leaked content. Yours or anyone else's." },
      { title: "Text only", body: "Never ask for, send or describe how to find intimate images or videos." },
      { title: "We are peers, not professionals", body: "Nothing here is legal, medical or mental health advice. If you are in danger, contact local emergency services or someone you trust." },
    ],
    accept: "I agree to these four things",
    enter: "Enter the Community",
  },

  rail: {
    title: "Rooms",
    spaces: "Spaces",
    unreadLabel: "unread",
    muted: "Muted",
    openRooms: "Open the room list",
    closeRooms: "Close the room list",
  },

  room: {
    about: "About this room",
    pinned: "Pinned",
    slowMode: (s: number) => `Slow mode: one message every ${s} seconds`,
    quietBadge: "Read and react only",
    staffBadge: "Team posts only",
    lockedBadge: "Paused",
    empty: {
      chat: { title: "Nobody has written here yet", body: "You can read first. There is no pressure to post. When you are ready, say as much or as little as you like." },
      quiet: { title: "Stories will appear here", body: "The team shares stories and gentle prompts in this room. You can react to let someone know you were here." },
      announcements: { title: "No announcements yet", body: "News from the Traceveil team will appear here." },
    },
    olderMessages: "Show earlier messages",
    loading: "Loading messages",
    newMessages: "New messages",
    reconnecting: "Reconnecting. Messages will catch up in a moment.",
    couldNotLoad: "We could not load this room.",
    retry: "Try again",
    mutedRoom: "Mute this room",
    unmutedRoom: "Unmute this room",
  },

  composer: {
    placeholder: "Write to everyone in this room",
    send: "Send",
    sending: "Sending",
    needLabel: "What would help",
    needNone: "No preference",
    need: { listen: "Someone to listen", advice: "Practical ideas", reading: "Just reading" } as Record<string, string>,
    needShort: { listen: "Wants someone to listen", advice: "Looking for practical ideas", reading: "Just reading" } as Record<string, string>,
    cwToggle: "Add a content warning",
    cwLabel: "Content warning",
    cwPlaceholder: "A few words about what is in this message",
    replyingTo: (name: string) => `Replying to ${name}`,
    cancelReply: "Cancel reply",
    limit: (left: number) => `${left} characters left`,
    mentionHint: "Type @ to mention someone who has written here recently",
    waitSlow: (s: number) => `You can write again in ${s}s`,
    edit: "Edit message",
    saveEdit: "Save",
    cancelEdit: "Cancel",
  },

  postingBlocked: {
    onboarding_required: "Finish choosing your name and accept the four rules to write here.",
    community_closed: "Conversation rooms are not open yet. You can read announcements and the quiet room.",
    room_locked: "This room is paused by the team for now.",
    staff_only_room: "Only the team writes in this room.",
    account_too_new: "This room opens to accounts that are a little older. Please check back soon.",
    muted_in_room: "You cannot write in this room for now.",
  } as Record<string, string>,

  personalDetails: {
    title: "Share this with everyone in the room?",
    body: "This looks like it may contain personal details. Everyone in this room can read it, and it may be seen by people outside your situation.",
    kinds: { phone: "a phone number", email: "an email address", government_id: "an ID number" } as Record<string, string>,
    edit: "Go back and edit",
    share: "Share anyway",
  },

  support: {
    title: "We are here with you",
    body: "Thank you for saying how things are. If you are thinking about harming yourself, please contact your local emergency number or someone you trust right now. You do not have to carry this alone.",
    helplines: "People you can talk to",
    dismiss: "Close",
    private: "Only you can see this message.",
  },

  message: {
    reply: "Reply",
    react: "React",
    more: "More",
    report: "Report this message",
    block: "Block this person",
    copyText: "Copy text",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: "Delete this message? This cannot be undone.",
    edited: "edited",
    deleted: "This message was deleted.",
    hiddenByTeam: "This message was hidden by the Community team.",
    showCw: "Show message",
    hideCw: "Hide again",
    cwPrefix: "Content warning",
    helper: "Verified helper",
    moderator: "Team",
    admin: "Admin",
    youLabel: "You",
    jumpToOriginal: "Go to the original message",
    replyUnavailable: "Original message is no longer available",
    replyCw: "Message with a content warning",
    leavingTitle: "You are leaving Traceveil",
    leavingBody: "This link was shared by a member of the team. Only continue if you trust it.",
    leavingGo: "Open link",
    leavingStay: "Stay here",
  },

  reactions: {
    care: { icon: "🤍", label: "Care" },
    hug: { icon: "🫂", label: "Sending a hug" },
    thanks: { icon: "🙏", label: "Thank you" },
    me_too: { icon: "🤝", label: "Me too" },
    strength: { icon: "💪", label: "Strength" },
    seen: { icon: "👀", label: "I read this" },
  } as Record<string, { icon: string; label: string }>,

  report: {
    title: "Report this message",
    lead: "Tell us what is wrong. The team will look at it. The person is not told that you reported them.",
    reasonLabel: "What is the problem?",
    reasons: {
      harassment: { label: "Harassment or unkindness", hint: "Being cruel, blaming, or targeting someone" },
      threat: { label: "A threat", hint: "Threatening harm or exposure" },
      fake_helper: { label: "Fake helper or scam", hint: "Offering paid removal, asking for money or personal details" },
      leaked_content: { label: "Sharing or pointing to leaked content", hint: "Links, or how to find content" },
      personal_details: { label: "Sharing personal details", hint: "Real names, numbers, addresses" },
      self_harm_risk: { label: "Someone may be at risk", hint: "Talking about harming themselves" },
      minor_involved: { label: "A child or teenager is involved", hint: "Anyone under 18" },
      spam: { label: "Spam or advertising", hint: "Repeated or unrelated promotion" },
      other: { label: "Something else", hint: "Anything that does not fit above" },
    } as Record<string, { label: string; hint: string }>,
    urgentNote: "This kind of report is marked urgent and reaches the team first.",
    noteLabel: "Anything else we should know? (optional)",
    submit: "Send report",
    thanksTitle: "Thank you for telling us",
    thanksBody: "The team has been told and will look at this. You may also want to block this person so you do not see their messages.",
    alsoBlock: "Block this person",
    done: "Close",
    already: "You have already reported this message.",
  },

  block: {
    title: "Block this person?",
    body: "You will no longer see their messages anywhere in the Community, and they will not be told. You can unblock them in your account settings.",
    confirm: "Block",
    cancel: "Cancel",
    done: "Blocked. Their messages are hidden for you.",
  },

  notifications: {
    title: "Notifications",
    empty: "Nothing new. We will tell you here if someone replies to you or mentions you.",
    markAll: "Mark all as read",
    kinds: {
      mention: (d: Record<string, unknown>) => `${d.fromName ?? "Someone"} mentioned you in ${d.roomTitle ?? "a room"}`,
      reply: (d: Record<string, unknown>) => `${d.fromName ?? "Someone"} replied to you in ${d.roomTitle ?? "a room"}`,
      report_result: (d: Record<string, unknown>) =>
        d.outcome === "no_action"
          ? "The team reviewed your report and decided no action was needed."
          : "The team reviewed your report and took action. Thank you for telling us.",
      mod_notice: (d: Record<string, unknown>) =>
        d.action === "warning" ? `A warning from the team: ${d.reason ?? ""}`
        : d.action === "message_hidden" ? `The team hid one of your messages: ${d.reason ?? ""}`
        : d.action === "restriction_lifted" ? `A restriction on your account was lifted: ${d.reason ?? ""}`
        : `A note from the team: ${d.reason ?? ""}`,
      restriction: (d: Record<string, unknown>) =>
        d.kind === "room_mute" ? `You cannot write in ${d.roomTitle ?? "a room"} for now. Reason: ${d.reason ?? ""}`
        : d.kind === "ban" ? `Your access was removed. Reason: ${d.reason ?? ""}`
        : `Your access is paused. Reason: ${d.reason ?? ""}`,
      appeal_decided: (d: Record<string, unknown>) =>
        d.decision === "overturned" ? `Your appeal was accepted. ${d.note ?? ""}` : `Your appeal was reviewed and the decision stands. ${d.note ?? ""}`,
      report_new: (d: Record<string, unknown>) => `${d.priority === "urgent" ? "Urgent report" : "New report"}: ${d.roomTitle ?? "a room"}`,
      report_escalated: () => "A report was escalated to the admins",
      appeal_new: () => "A new appeal is waiting",
      role_changed: (d: Record<string, unknown>) => `Your role is now ${String(d.role ?? "").replace("_", " ")}`,
    } as Record<string, (d: Record<string, unknown>) => string>,
  },

  account: {
    title: "Your account",
    nameSection: "How you appear",
    nameSaved: "Name updated",
    newAvatar: "New picture",
    privacySection: "Your privacy",
    privacyPoints: [
      "Other members only ever see your made-up name and picture.",
      "The team can read messages in rooms (that is how moderation works). Nobody can read messages in private, because there are none.",
      "Messages are deleted automatically after a set time. Ask the team how long.",
      "We do not store IP addresses or use tracking.",
    ],
    passwordSection: "Password",
    passwordHint: "Optional. Lets you sign in without your recovery phrase.",
    setPassword: "Set password",
    passwordSaved: "Password saved",
    blockedSection: "People you blocked",
    blockedEmpty: "You have not blocked anyone.",
    unblock: "Unblock",
    restrictionsSection: "Decisions about your account",
    appeal: "Ask for a review",
    appealLead: "Tell us what you think we got wrong. An admin will read it.",
    appealPlaceholder: "Write a few sentences",
    appealSent: "Your appeal was sent. We will reply here.",
    appealStatus: { open: "Waiting for a decision", upheld: "Reviewed. The decision stands", overturned: "Accepted" } as Record<string, string>,
    restrictionKind: { room_mute: "Muted in a room", suspend: "Access paused", ban: "Access removed" } as Record<string, string>,
    deleteSection: "Delete my account",
    deleteLead: "This removes your sign-in. Your past messages stay in the rooms until they expire, but they will show as “Deleted member” and cannot be linked back to you.",
    deleteConfirmLabel: "Type “delete my account” to confirm",
    deleteButton: "Delete my account",
    signOut: "Sign out",
  },

  topbar: {
    leaveQuickly: "Leave quickly",
    leaveHint: "Closes this page right away. You can also press Escape three times.",
    notifications: "Notifications",
    account: "Your account",
    moderation: "Moderation",
    admin: "Admin",
    back: "Back to Traceveil",
    live: "Live",
  },

  restricted: {
    suspended: "Your access to the Community is paused",
    banned: "Your access to the Community has been removed",
    lead: "You can see why below, and ask for a review.",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    signedOut: "Please sign in to continue.",
  },
} as const;

export type Copy = typeof copy;
