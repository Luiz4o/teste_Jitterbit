// 8. Escreva uma função em JavaScript chamada “somaImpares” que recebe um número inteiro
// positivo “n” como parâmetro e retorna a soma de todos os números ímpares de 1 até n.

function somaImpares(n){
    let result = 0
    for (let i = 1 ; i <= n; i++ ) {
        result += i % 2 == 1 ? i : 0    
    }
    return result
}

console.log(somaImpares(10))


// 9. Escreva uma função chamada” inverterPalavra” que recebe uma string como parâmetro e retorna a
// string com as letras invertidas.

function inverterPalavra(palavra){
    result = ""
    for (let i = String(palavra).length - 1 ; i >= 0; i-- ) {
        result += String(palavra).charAt(i)
    }
    return result
}

console.log(inverterPalavra("Lula"))