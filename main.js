/* jshint curly:true, debug:true */
/* globals $, firebase */

 
let currentUID;

var map;
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 36, lng: 140 },
    zoom: 8
  });
}

const vm = new Vue({
  el: '#travel',
  data: {
    newItem: '',
    todos: [
      'ドラッグで並び変えできます',
      '旅程順に並び替えてください',
    ]
  },
  // watch: {
  //   todos: {
  //     handler: function() {
  //       localStorage.setItem('todos', JSON.stringify(this.todos));
  //     },
  //     deep: true
  //   }
      
  // },
  // mounted: function() {
  //   this.todos = JSON.parse(localStorage.getItem('todos')) || [];
  // },
    
  methods: {
    addItem: function() {
      this.todos.push(this.newItem);
      this.newItem = '';
    },
    deleteItem: function(index) {
      this.todos.splice(index, 1);
    },     
  }
});  

// カレンダー


{
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  function getCalendarHead() {
    const dates = [];
    const d = new Date(year, month, 0).getDate();
    const n = new Date(year, month, 1).getDay();

    for (let i = 0; i < n; i++) {
      // 30
      // 29, 30
      // 28, 29, 30
      dates.unshift({
        date: d - i,
        isToday: false,
        isDisabled: true,
      });
    }

    return dates;
  }

  function getCalendarBody() {
    const dates = []; // date: 日付, day: 曜日
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= lastDate; i++) {
      dates.push({
        date: i,
        isToday: false,
        isDisabled: false,
      });
    }

    if (year === today.getFullYear() && month === today.getMonth()) {
      dates[today.getDate() - 1].isToday = true;
    }

    return dates;
  }

  function getCalendarTail() {
    const dates = [];
    const lastDay = new Date(year, month + 1, 0).getDay();

    for (let i = 1; i < 7 - lastDay; i++) {
      dates.push({
        date: i,
        isToday: false,
        isDisabled: true,
      });
    }

    return dates;
  }

  function clearCalendar() {
    const tbody = document.querySelector('tbody');

    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
  }

  function renderTitle() {
    const title = `${year}/${String(month + 1).padStart(2, '0')}`;
    document.getElementById('title').textContent = title;
  }

  function renderWeeks() {
    const dates = [
      ...getCalendarHead(),
      ...getCalendarBody(),
      ...getCalendarTail(),
    ];
    const weeks = [];
    const weeksCount = dates.length / 7;

    for (let i = 0; i < weeksCount; i++) {
      weeks.push(dates.splice(0, 7));
    }

    weeks.forEach(week => {
      const tr = document.createElement('tr');
      week.forEach(date => {
        const td = document.createElement('td');

        td.textContent = date.date;
        if (date.isToday) {
          td.classList.add('today');
        }
        if (date.isDisabled) {
          td.classList.add('disabled');
        }

        tr.appendChild(td);
      });
      document.querySelector('tbody').appendChild(tr);
    });
  }

  function createCalendar() {
    clearCalendar();
    renderTitle();
    renderWeeks();
  }

  document.getElementById('prev').addEventListener('click', () => {
    month--;
    if (month < 0) {
      year--;
      month = 11;
    }

    createCalendar();
  });

  document.getElementById('next').addEventListener('click', () => {
    month++;
    if (month > 11) {
      year++;
      month = 0;
    }

    createCalendar();
  });

  document.getElementById('today').addEventListener('click', () => {
    year = today.getFullYear();
    month = today.getMonth();

    createCalendar();
  });

  createCalendar();
}

/**
 * --------------------
 * Flickr API 関連の関数
 * --------------------
 */
const API_KEY = '';

// 検索テキストに応じたデータを取得するためのURLを作成して返す
const getRequestURL = (searchText) => {
  const parameters = $.param({
    method: 'flickr.photos.search',
    api_key: API_KEY,
    text: searchText, // 検索テキスト
    sort: 'interestingness-desc', // 興味深さ順
    per_page: 9, // 取得件数
    license: '4', // Creative Commons Attributionのみ
    extras: 'owner_name,license', // 追加で取得する情報
    format: 'json', // レスポンスをJSON形式に
    nojsoncallback: 1, // レスポンスの先頭に関数呼び出しを含めない
  });
  const url = `https://api.flickr.com/services/rest/?${parameters}`;
  return url;
};

// photoオブジェクトから画像のURLを作成して返す
const getFlickrImageURL = (photo, size) => {
  let url = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${
    photo.secret
  }`;
  if (size) {
    // サイズ指定ありの場合
    url += `_${size}`;
  }
  url += '.jpg';
  return url;
};

// photoオブジェクトからページのURLを作成して返す
const getFlickrPageURL = photo => `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;

// photoオブジェクトからaltテキストを生成して返す
const getFlickrText = (photo) => {
  let text = `"${photo.title}" by ${photo.ownername}`;
  if (photo.license === '4') {
    // Creative Commons Attribution（CC BY）ライセンス
    text += ' / CC BY';
  }
  return text;
};

/**
 * ----------------------------------
 * Tooltipを表示するカスタムディレクティブ
 * ----------------------------------
 */

Vue.directive('tooltip', {
  bind(el, binding) {
    $(el).tooltip({
      title: binding.value,
      placement: 'bottom',
    });
  },
  unbind(el) {
    $(el).tooltip('dispose');
  },
});

/**
 * -------------
 * Vueインスタンス
 * -------------
 */

new Vue({
  el: '#app',
  data: {
    photos: [],
  },
  methods: {
    fetchImagesFromFlickr(event) {
      const searchText = event.target.elements.search.value;
      const url = getRequestURL(searchText);

      $.getJSON(url, (data) => {
        if (data.stat !== 'ok') {
          return;
        }

        this.photos = data.photos.photo.map(photo => ({
          id: photo.id,
          imageURL: getFlickrImageURL(photo, 'q'),
          pageURL: getFlickrPageURL(photo),
          text: getFlickrText(photo),
        }));
      });
    },
  },
});
  

