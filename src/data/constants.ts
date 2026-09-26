export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  game: 'ALL' | 'BLUFF_CITY' | 'MURDER_MYSTERY' | 'SECRET_AUCTION';
  icon: string;
  rewardCoins: number;
  rewardXp: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // General & Platform
  { id: 'first_blood', title: 'First Blood', description: 'Complete your first match in Social Wars.', game: 'ALL', icon: '⚔️', rewardCoins: 200, rewardXp: 150 },
  { id: 'victory_royale', title: 'Champion of the Night', description: 'Win any 5-player match.', game: 'ALL', icon: '🏆', rewardCoins: 500, rewardXp: 400 },
  { id: 'win_streak_3', title: 'On Fire', description: 'Achieve a 3-game winning streak.', game: 'ALL', icon: '🔥', rewardCoins: 800, rewardXp: 600 },
  { id: 'win_streak_5', title: 'Unstoppable Force', description: 'Achieve a 5-game winning streak.', game: 'ALL', icon: '⚡', rewardCoins: 1500, rewardXp: 1200 },
  { id: 'win_streak_10', title: '10-Win Legend', description: 'Achieve a 10-game winning streak.', game: 'ALL', icon: '👑', rewardCoins: 3000, rewardXp: 2500 },
  { id: 'no_hint_solver', title: 'No-Hint Genius', description: 'Win a match without using a single hint.', game: 'ALL', icon: '🧠', rewardCoins: 600, rewardXp: 500 },
  { id: 'social_butterfly', title: 'Social Networker', description: 'Play matches with 10 different players.', game: 'ALL', icon: '🦋', rewardCoins: 400, rewardXp: 300 },
  { id: 'high_roller_club', title: 'High Roller', description: 'Accumulate 25,000 Social Coins in your wallet.', game: 'ALL', icon: '💎', rewardCoins: 1000, rewardXp: 800 },
  { id: 'millionaire', title: 'Paper Millionaire', description: 'Surpass 100,000 net worth across games.', game: 'ALL', icon: '💰', rewardCoins: 2000, rewardXp: 1500 },
  { id: 'veteran_host', title: 'Master of Ceremonies', description: 'Host and successfully finish 5 complete rooms.', game: 'ALL', icon: '🎖️', rewardCoins: 500, rewardXp: 400 },
  { id: 'speed_demon', title: 'Speed Demon', description: 'Make a winning decision within the first 10 seconds of a phase.', game: 'ALL', icon: '⏱️', rewardCoins: 300, rewardXp: 250 },
  { id: 'comeback_king', title: 'Comeback King', description: 'Win from last place in the final round.', game: 'ALL', icon: '🦅', rewardCoins: 1200, rewardXp: 1000 },
  { id: 'flawless_victory', title: 'Flawless Strategy', description: 'Achieve over 90% decision accuracy in a match.', game: 'ALL', icon: '✨', rewardCoins: 900, rewardXp: 750 },
  { id: 'night_owl', title: 'Midnight Tactician', description: 'Play 3 matches in a single session.', game: 'ALL', icon: '🦉', rewardCoins: 350, rewardXp: 300 },

  // Bluff City
  { id: 'perfect_bluff', title: 'The Silver Tongue', description: 'Successfully deceive the table and complete your secret objective as Criminal.', game: 'BLUFF_CITY', icon: '🎭', rewardCoins: 750, rewardXp: 600 },
  { id: 'hound_of_law', title: 'Bloodhound', description: 'Identify the Criminal within 2 rounds in Bluff City.', game: 'BLUFF_CITY', icon: '🐕', rewardCoins: 700, rewardXp: 550 },
  { id: 'expose_master', title: 'Pulitzer Prize', description: 'Publish 3 verified exposés as the Journalist.', game: 'BLUFF_CITY', icon: '📰', rewardCoins: 650, rewardXp: 500 },
  { id: 'city_savior', title: 'Pillar of Society', description: 'Keep City Stability above 85% until the game ends.', game: 'BLUFF_CITY', icon: '🏛️', rewardCoins: 600, rewardXp: 500 },
  { id: 'anarchy_reigns', title: 'Architect of Chaos', description: 'Drive City Stability below 25% and profit from the Black Market.', game: 'BLUFF_CITY', icon: '💥', rewardCoins: 800, rewardXp: 650 },
  { id: 'master_negotiator', title: 'Master Negotiator', description: 'Form a public pact and have all parties honor it.', game: 'BLUFF_CITY', icon: '🤝', rewardCoins: 500, rewardXp: 400 },
  { id: 'the_ghost', title: 'The Ghost', description: 'Finish a Bluff City match with zero suspicion or accusations cast on you.', game: 'BLUFF_CITY', icon: '👤', rewardCoins: 900, rewardXp: 750 },
  { id: 'mayor_elected', title: 'Mister Mayor', description: 'Win a unanimous vote in City Council.', game: 'BLUFF_CITY', icon: '🗳️', rewardCoins: 850, rewardXp: 700 },
  { id: 'black_market_baron', title: 'Contraband King', description: 'Perform 4 successful Black Market operations in a single match.', game: 'BLUFF_CITY', icon: '🕶️', rewardCoins: 750, rewardXp: 600 },
  { id: 'double_agent_triumph', title: 'Twisted Loyalty', description: 'Win a match playing as the Double Agent.', game: 'BLUFF_CITY', icon: '♟️', rewardCoins: 1000, rewardXp: 800 },
  { id: 'reputation_100', title: 'Saint of Bluff City', description: 'Reach 100 Reputation score in Bluff City.', game: 'BLUFF_CITY', icon: '⭐', rewardCoins: 700, rewardXp: 550 },
  { id: 'master_bribe', title: 'Money Talks', description: 'Bribe 3 officials and change a council decision.', game: 'BLUFF_CITY', icon: '💵', rewardCoins: 500, rewardXp: 400 },

  // Murder Mystery
  { id: 'master_detective', title: 'Sherlock of Blackwood', description: 'Accuse the true murderer with 100% confidence and matching evidence.', game: 'MURDER_MYSTERY', icon: '🕵️', rewardCoins: 1000, rewardXp: 850 },
  { id: 'perfect_crime', title: 'The Perfect Crime', description: 'Win as the Murderer without being accused by the majority.', game: 'MURDER_MYSTERY', icon: '🔪', rewardCoins: 1200, rewardXp: 1000 },
  { id: 'escape_artist', title: 'Houdini of the Manor', description: 'Successfully escape Blackwood Manor during the 90-second Escape Phase.', game: 'MURDER_MYSTERY', icon: '🚪', rewardCoins: 1100, rewardXp: 950 },
  { id: 'crime_scene_sweeper', title: 'Forensic Prodigy', description: 'Discover 4 authentic pieces of evidence before anyone else.', game: 'MURDER_MYSTERY', icon: '🔬', rewardCoins: 650, rewardXp: 500 },
  { id: 'cctv_master', title: 'Eye in the Sky', description: 'Reconstruct the timeline using the Security Room CCTV.', game: 'MURDER_MYSTERY', icon: '📹', rewardCoins: 550, rewardXp: 450 },
  { id: 'forged_trail', title: 'Frame Job', description: 'Successfully plant a forged piece of evidence that convinces someone.', game: 'MURDER_MYSTERY', icon: '📜', rewardCoins: 800, rewardXp: 650 },
  { id: 'ironclad_alibi', title: 'Untouchable Alibi', description: 'Have 2 witnesses independently verify your alibi.', game: 'MURDER_MYSTERY', icon: '🛡️', rewardCoins: 600, rewardXp: 500 },
  { id: 'vault_cracker', title: 'Blackwood Vault Secret', description: 'Unlock the secret safe in the Private Vault.', game: 'MURDER_MYSTERY', icon: '🏦', rewardCoins: 700, rewardXp: 550 },
  { id: 'lockdown_hero', title: 'The Trapdoor Closes', description: 'Block the killer’s final escape route as an investigator.', game: 'MURDER_MYSTERY', icon: '🔒', rewardCoins: 900, rewardXp: 750 },
  { id: 'dark_secret_kept', title: 'Buried Sins', description: 'Finish the game without having your personal dark secret exposed.', game: 'MURDER_MYSTERY', icon: '🤫', rewardCoins: 500, rewardXp: 400 },
  { id: 'toxicology_sleuth', title: 'Poison or Dagger?', description: 'Identify the exact murder weapon on your first laboratory analysis.', game: 'MURDER_MYSTERY', icon: '🧪', rewardCoins: 600, rewardXp: 500 },
  { id: 'manor_historian', title: 'Blackwood Manor Historian', description: 'Search every room in Blackwood Manor across your matches.', game: 'MURDER_MYSTERY', icon: '🏰', rewardCoins: 750, rewardXp: 600 },

  // Secret Auction
  { id: 'auction_king', title: 'Auction Tycoon', description: 'Win 4 assets in a single match and finish with the highest net worth.', game: 'SECRET_AUCTION', icon: '🃏', rewardCoins: 1000, rewardXp: 850 },
  { id: 'anti_snipe_sniper', title: 'Clutch Bidder', description: 'Win a lot by counter-bidding during anti-snipe overtime.', game: 'SECRET_AUCTION', icon: '🎯', rewardCoins: 650, rewardXp: 550 },
  { id: 'bargain_hunter', title: 'Bargain Hunter', description: 'Acquire an asset for less than 60% of its true market value.', game: 'SECRET_AUCTION', icon: '🏷️', rewardCoins: 700, rewardXp: 600 },
  { id: 'due_diligence', title: 'Wall Street Analyst', description: 'Perform full research on 3 lots before bidding on them.', game: 'SECRET_AUCTION', icon: '📊', rewardCoins: 500, rewardXp: 400 },
  { id: 'market_oracle', title: 'The Big Long', description: 'Hold assets matching a positive Market Event and gain +30% value surge.', game: 'SECRET_AUCTION', icon: '📈', rewardCoins: 800, rewardXp: 650 },
  { id: 'hedge_fund_manager', title: 'Hedge Fund Mogul', description: 'Own at least one asset in 4 different market sectors.', game: 'SECRET_AUCTION', icon: '🌐', rewardCoins: 750, rewardXp: 600 },
  { id: 'debt_free_champion', title: 'Pristine Balance Sheet', description: 'Win Secret Auction with zero bank debt remaining.', game: 'SECRET_AUCTION', icon: '⚖️', rewardCoins: 900, rewardXp: 750 },
  { id: 'art_of_the_deal', title: 'Art of the Deal', description: 'Complete a mutual trade involving assets and cash with another player.', game: 'SECRET_AUCTION', icon: '🤝', rewardCoins: 600, rewardXp: 500 },
  { id: 'liquidity_king', title: 'Cash is King', description: 'End an auction match with over 150,000 liquid coins.', game: 'SECRET_AUCTION', icon: '🏦', rewardCoins: 1100, rewardXp: 900 },
  { id: 'angel_investor', title: 'Angel Syndicate', description: 'Sell equity shares of your company to another player.', game: 'SECRET_AUCTION', icon: '🚀', rewardCoins: 700, rewardXp: 550 },
  { id: 'recession_survivor', title: 'Weathered the Storm', description: 'Survive a Global Recession event without defaulting on loan payments.', game: 'SECRET_AUCTION', icon: '🌪️', rewardCoins: 850, rewardXp: 700 },
  { id: 'quad_monopoly', title: 'Monopolist', description: 'Control 3 assets in the same category (e.g. 3 Luxury assets).', game: 'SECRET_AUCTION', icon: '🏰', rewardCoins: 1200, rewardXp: 1000 },
];

export interface CosmeticItem {
  id: string;
  name: string;
  type: 'AVATAR' | 'TITLE' | 'FRAME' | 'THEME';
  cost: number;
  preview: string;
  description: string;
}

export const COSMETIC_ITEMS: CosmeticItem[] = [
  // Avatars
  { id: 'av_wolf', name: 'Alpha Wolf', type: 'AVATAR', cost: 0, preview: '🐺', description: 'Sharp instincts and calculated moves.' },
  { id: 'av_fox', name: 'Shadow Fox', type: 'AVATAR', cost: 0, preview: '🦊', description: 'Sly, deceptive, and unpredictable.' },
  { id: 'av_lion', name: 'Noble Lion', type: 'AVATAR', cost: 0, preview: '🦁', description: 'Commands respect across the table.' },
  { id: 'av_tiger', name: 'Savage Tiger', type: 'AVATAR', cost: 0, preview: '🐯', description: 'Strikes when others show weakness.' },
  { id: 'av_owl', name: 'Midnight Owl', type: 'AVATAR', cost: 0, preview: '🦉', description: 'Sees the truth through darkness.' },
  { id: 'av_spy', name: 'Secret Agent', type: 'AVATAR', cost: 1500, preview: '🕵️', description: 'Hidden beneath a fedora and trench coat.' },
  { id: 'av_tycoon', name: 'Gold Magnate', type: 'AVATAR', cost: 2500, preview: '🧐', description: 'Monocle and cigar. Knows the price of everything.' },
  { id: 'av_ninja', name: 'Shinobi', type: 'AVATAR', cost: 2000, preview: '🥷', description: 'Silent footsteps, invisible intentions.' },
  { id: 'av_robot', name: 'Cyber Android', type: 'AVATAR', cost: 3500, preview: '🤖', description: 'Zero emotions, purely mathematical decisions.' },
  { id: 'av_wizard', name: 'Grand Illusionist', type: 'AVATAR', cost: 4000, preview: '🧙', description: 'Now you see the truth, now you don\'t.' },

  // Titles
  { id: 'title_novice', name: 'Rookie Tactician', type: 'TITLE', cost: 0, preview: 'Rookie Tactician', description: 'Starting title.' },
  { id: 'title_ghost', name: 'The Phantom', type: 'TITLE', cost: 1200, preview: 'The Phantom', description: 'Leaves no trace of deceit.' },
  { id: 'title_mastermind', name: 'The Mastermind', type: 'TITLE', cost: 2500, preview: 'The Mastermind', description: 'Always three moves ahead.' },
  { id: 'title_whale', name: 'Market Whale', type: 'TITLE', cost: 3000, preview: 'Market Whale', description: 'Moves markets with a single bid.' },
  { id: 'title_sherlock', name: 'Ace Inquisitor', type: 'TITLE', cost: 2000, preview: 'Ace Inquisitor', description: 'No lie escapes their gaze.' },
  { id: 'title_untouchable', name: 'The Untouchable', type: 'TITLE', cost: 5000, preview: 'The Untouchable', description: 'Reserved for elite strategists.' },

  // Frames
  { id: 'frame_default', name: 'Simple Slate', type: 'FRAME', cost: 0, preview: 'border-slate-700', description: 'Standard sleek border.' },
  { id: 'frame_gold', name: 'Imperial Gold', type: 'FRAME', cost: 2000, preview: 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20', description: 'Radiates regal authority.' },
  { id: 'frame_neon_cyan', name: 'Neon Cyberpunk', type: 'FRAME', cost: 2500, preview: 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/30', description: 'Vibrant neon blue glow.' },
  { id: 'frame_crimson', name: 'Crimson Blood', type: 'FRAME', cost: 3000, preview: 'border-rose-500 ring-2 ring-rose-500/50 shadow-rose-500/30', description: 'Intimidating crimson aura.' },
  { id: 'frame_emerald', name: 'Emerald Velvet', type: 'FRAME', cost: 2500, preview: 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30', description: 'Rich gemstone elegance.' },
  { id: 'frame_obsidian', name: 'Obsidian Void', type: 'FRAME', cost: 4500, preview: 'border-purple-500 ring-2 ring-purple-500/60 shadow-purple-500/40', description: 'Cosmic purple mystery.' },
];
