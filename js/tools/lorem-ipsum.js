document.addEventListener('DOMContentLoaded', () => {
  const WORDS = [
    'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do',
    'eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim',
    'ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi',
    'aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit',
    'voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint',
    'occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt',
    'mollit','anim','id','est','laborum','porta','nibh','venenatis','cras','fermentum',
    'posuere','urna','nec','tincidunt','praesent','semper','feugiat','lectus','pharetra',
    'massa','ultricies','mi','quis','hendrerit','lacus','suspendisse','faucibus','interdum',
    'volutpat','ac','tincidunt','vitae','augue','eget','arcu','dictum','varius','duis',
    'at','tellus','mauris','pellentesque','pulvinar','sagittis','eu','volutpat','odio',
    'facilisis','gravida','neque','convallis','a','cras','adipiscing','enim','eu','turpis',
    'egestas','pretium','aenean','pharetra','nunc','sed','blandit','libero','volutpat',
    'maecenas','accumsan','lacus','vel','facilisis','elementum','integer','enim','neque',
    'ornare','aenean','euismod','viverra','justo','nec','ultrices','dui','sapien','eget'
  ];

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randWord() { return WORDS[Math.floor(Math.random() * WORDS.length)]; }

  function genSentence(wordCount) {
    const n = wordCount || randInt(8, 15);
    const words = [];
    for (let i = 0; i < n; i++) words.push(randWord());
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
  }

  function genParagraph(sentenceCount) {
    const n = sentenceCount || randInt(4, 7);
    const sentences = [];
    for (let i = 0; i < n; i++) sentences.push(genSentence());
    return sentences.join(' ');
  }

  function generate() {
    const type = document.getElementById('gen-type').value;
    const count = parseInt(document.getElementById('gen-count').value) || 1;
    const startWithLorem = document.getElementById('gen-lorem').checked;
    let result = [];

    if (type === 'paragraphs') {
      for (let i = 0; i < count; i++) result.push(genParagraph());
    } else if (type === 'sentences') {
      for (let i = 0; i < count; i++) result.push(genSentence());
    } else {
      const words = [];
      for (let i = 0; i < count; i++) words.push(randWord());
      result.push(words.join(' '));
    }

    if (startWithLorem && result.length > 0) {
      result[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + result[0];
    }

    const separator = type === 'paragraphs' ? '\n\n' : ' ';
    document.getElementById('lorem-output').value = result.join(separator);
  }

  document.getElementById('generate-btn').addEventListener('click', generate);
  document.getElementById('copy-btn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('lorem-output').value);
  });

  generate();
  renderRelatedTools('lorem-ipsum-generator');
});
