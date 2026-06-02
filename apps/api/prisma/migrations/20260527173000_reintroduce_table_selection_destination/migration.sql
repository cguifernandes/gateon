-- Reintroduce QUICK_ALERT to support "Aviso Rápido" inside alert creation.
ALTER TYPE "AlertDestinationType" ADD VALUE IF NOT EXISTS 'QUICK_ALERT';
