<script setup lang="ts">
</script>

<template>
  <RouterView />
  <InviteModal />
  <ConfirmDialog />
  <ToastContainer />
</template>

<script setup lang="ts">
import InviteModal from './components/InviteModal.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastContainer from './components/ToastContainer.vue';
</script>
