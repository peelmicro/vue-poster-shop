var PRICE = 9.99;
var LOAD_NUM = 10;

var pusher = new Pusher('d0f9c4c0f290ac7f3c3e', {
  cluster: 'eu',
  encrypted: true
})

new Vue({
  el: "#app",
  data: {
    total: 0,
    items: [],
    cart: [],
    results: [],
    newSearch: 'anime',
    lastSearch: '',
    loading: false,
    price: PRICE,
    pusherUpdate: false
  },
  mounted: function() {
    this.onSubmit()
    var vueInstance = this
    var elem = document.getElementById('product-list-bottom');
    var watcher = scrollMonitor.create(elem);
    watcher.enterViewport(function() {
      vueInstance.appendItems()
    })    
    var channel = pusher.subscribe('cart');
    channel.bind('update', async (data) => {
      await vueInstance.updatePusherData(data)
    });
    channel.bind('pusher:subscription_succeeded', async () => {
      await vueInstance.$http.post('/newClient', this.cart)
    });    
    channel.bind('newClient', async (data) => {
      await vueInstance.$http.post('/cart_update', vueInstance.cart)
    });    
  },  
  watch: {
    cart: {
      handler: function (val) {
        if (!this.pusherUpdate) {
          this.$http.post('/cart_update', val)
        }
        this.pusherUpdate=false
      },
      deep: true // It checks any changes nested 
    }
  },
  methods: {
    updatePusherData (data) {
      this.pusherUpdate = true;
      this.cart = data;
      this.total = 0;
      for (var i=0; i < this.cart.length; i++) {
        this.total += PRICE * this.cart[i].qty
      }
    },
    appendItems() {
      if (this.items.length < this.results.length) {
        var append = this.results.slice(this.items.length, this.items.length + LOAD_NUM);
        this.items = this.items.concat(append);
      }
    },
    onSubmit: function() {
      if (this.newSearch.length) {
        this.items=[];
        this.loading=true;
        this.$http
         .get('/search/'.concat(this.newSearch))
         .then(function(res) {
           this.results = res.data;
           this.appendItems();
           this.lastSearch = this.newSearch;
           this.loading=false;
         })
      }
    },
    addItem: function(index) {
      var item = this.items[index]
      var found = false;
      for( var i=0; i < this.cart.length; i++ ) {
        if (this.cart[i].id === item.id) {
          this.cart[i].qty++;
          found = true;
          break;
        }
      }
      if (!found) {
        this.cart.push({
          id: item.id,
          title: item.title,
          price: PRICE,
          qty: 1
        })
      }
      this.total += PRICE
    },
    inc: function(item) {
      item.qty++
      this.total += PRICE
    },
    dec: function(item) {
      item.qty--
      this.total -= PRICE
      if (item.qty==0) {
        for( var i=0; i < this.cart.length; i++ ) {
          if (this.cart[i].id === item.id) {
            this.cart.splice(i,1)
            break
          }
        }        
      } 
    }
    
  },
  filters: {
    currency: function(price) {
      return '$'.concat(price.toFixed(2))
    }
  },
  computed: {
    noMoreItems: function() {
      return this.items.length>0 && this.items.length === this.results.length
    }
  }
})

