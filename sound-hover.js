// Configuração do som
const soundConfig = {
    path: 'assets/hover-sound.mp3',
    volume: 0.3
};

// Criar objeto de áudio
let hoverSound = null;

/**
 * Inicializa o som para o botão
 */
function initHoverSound() {
    hoverSound = new Audio(soundConfig.path);
    hoverSound.volume = soundConfig.volume;
}

/**
 * Reproduz o som do hover
 */
function playHoverSound() {
    if (hoverSound) {
        // Reinicia o som para permitir reprodução rápida
        hoverSound.currentTime = 0;
        
        // Toca o som e trata erros
        hoverSound.play().catch(error => {
            console.log('Som desativado ou erro de reprodução:', error.message);
        });
    }
}

/**
 * Adiciona evento de hover ao botão
 */
function attachHoverEvent() {
    const button = document.getElementById('btn-despesa');
    
    if (button) {
        button.addEventListener('mouseenter', playHoverSound);
        console.log('Som de hover ativado no botão!');
    } else {
        console.error('Botão não encontrado: btn-despesa');
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initHoverSound();
    attachHoverEvent();
});