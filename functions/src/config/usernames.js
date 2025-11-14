/**
 * 90s-style Usernames Configuration
 *
 * Pool of authentic 90s-era internet usernames for review attribution.
 * This is a simplified version for refactoring; will be expanded with
 * the full 100+ username list during movie enhancement implementation.
 */

const USERNAMES_90S = [
  // xX_name_Xx format
  'xXDarkAngelXx',
  'xXShadowWalkerXx',
  'xXNeoMatrix99Xx',
  'xXCinephile420Xx',
  'xXFilmFreakXx',
  'xXReelMasterXx',

  // Pop culture + numbers
  'TitanicFan97',
  'JurassicPark93',
  'BackstreetBro95',
  'SpiceGirlsForever',
  'PulpFictionFan94',
  'FightClubBro99',
  'MatrixFanatic99',
  'StarWarsFan77',
  'WaynesWorld92',
  'BuffySlayer97',

  // Underscore style
  'sad_film_goblin',
  'movie_wizard_69',
  'eternal_cinephile',
  'popcorn_prophet',
  'broken_vcr_heart',
  'reel_talk_master',
  'film_snob_2000',
  'dvd_collector_99',
  'vhs_memories',
  'indie_kid_forever',

  // Leetspeak
  'M0v13M4st3r',
  'C1n3m4K1ng',
  'F1lmFr34k1337',
  'R33lT4lk88',
  'Scr33nG33k',
  'Pr0j3ct10n1st',
  'D1r3ct0rsCut',
  'B0xOffic3King',

  // Early internet memes
  'AllYourBase2000',
  'DancingBaby99',
  'BadgerBadger96',
  'ChocolateRain88',
  'LeeRoyJenkins',
  'TrogdorFan',
  'HomestarRunner99',
  'StrongBadEmail',

  // Random combos
  'CoolDude420',
  'MovieLover2000',
  'ReelDeal247',
  'FilmFan1337',
  'ActionJunkie88',
  'NachoAverageCritic',
  'TheatreGeek95',
  'ScreenJunkie99',
  'CinematicDreams',
  'FlickPicks247',

  // Emo/Scene era
  'xoxo_filmgirl_xoxo',
  'rawr_movies_rawr',
  'screamo_cinema',
  'my_chemical_films',
  'fall_out_movies',
  'panic_at_the_cinema',
  'emo_film_kid',

  // Genre-specific
  'HorrorFan666',
  'RomComQueen98',
  'SciFiNerd2000',
  'ActionHero247',
  'IndieFilmKid',
  'DocumentaryDude',
  'AnimationStation99',
  'ThrillerChiller',
  'ComedyGold88',

  // Tech/Gaming references
  'AOL_ScreenName',
  'ICQ_Movie_Buff',
  'Napster_Films',
  'Kazaa_Cinema',
  'Netscape_Navigator',
  'AltaVista_Search',
  'GeoCities_Critic',
  'AngelFire_Reviews',
  'MSN_Messenger99',
  'Yahoo_Movies247',

  // Additional usernames
  'MovieManiac1999',
  'film_critic_elite',
];

/**
 * Get a random username from the pool
 * @returns {string} Random 90s-style username
 */
function getRandomUsername() {
  return USERNAMES_90S[Math.floor(Math.random() * USERNAMES_90S.length)];
}

module.exports = {
  USERNAMES_90S,
  getRandomUsername,
};
