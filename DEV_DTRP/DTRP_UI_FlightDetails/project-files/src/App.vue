<template lang="pug">
  #app
    link(rel="stylesheet" href="https://use.fontawesome.com/releases/v5.5.0/css/all.css" integrity="sha384-B4dIYHKNBt8Bc12p+WXckhzcICo0wtJAoU8YZTY5qE0Id1GSseTk6S+L3BlXeVIU" crossorigin="anonymous")
    link(rel="stylesheet" href="//cdn.materialdesignicons.com/2.5.94/css/materialdesignicons.min.css")
    router-view
    button.button.btn-back-to-top.is-primary.is-warning.is-rounded(v-show="hasScrolledDown && (isTabletSize || isPhoneSize)" @click="scrollTop")
      span.icon
        i.fas.fa-long-arrow-alt-up
      | Nach Oben
    footer.footer
      p &copy; 2019 Maximilian Vollstädt
</template>

<script>

import * as Helpers from './lib/helpers';

export default {
  name: 'app',
  mixins: [Helpers.mixin],
  data() {
    return {
    };
  },

  methods: {

  },

  computed: {
  },

};

</script>

<style lang="sass">
html
  scroll-behavior: smooth
#app
  font-family: 'Avenir', Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50

.btn-back-to-top
  position: fixed
  bottom: 20px
  right: 20px
  .icon
    padding-right: 5px
</style>
