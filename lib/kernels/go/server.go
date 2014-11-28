package main

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"os/exec"
	// "bufio"
	"bytes"
	"fmt"
	"log"
)

type CompileRequest struct {
	Code string            `json:"code"`
	Env  map[string]string `json:"env"`
}

type CompileResponse struct {
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
	Status int    `json:"status"`
	Signal int    `json:"signal"`
}

type CompileFailed struct {
	Error string `json:"error"`
}

func compileThem(w http.ResponseWriter, r *http.Request) {

	var text = make([]byte, r.ContentLength)
	if _, err := r.Body.Read(text); err != nil {
		fmt.Fprintf(w, "Failed to read body...")
		return
	}

	var data CompileRequest
	if err := json.Unmarshal(text, &data); err != nil {
		fmt.Fprintf(w, "Failed to parse...")
		return
	}

	cmdname := "/tmp/gocompile"
	filename := cmdname + ".go"

	if err := ioutil.WriteFile(filename, []byte(data.Code), 0644); err != nil {
		fmt.Fprintf(w, "Failed to write to gile...")
		return
	}

	cmd := exec.Command("go", "build", "-o", cmdname, filename)
	var err bytes.Buffer
	cmd.Stderr = &err
	if e := cmd.Run(); e != nil {
		w.WriteHeader(406)

		stderr := err.String()
		res := CompileFailed{stderr}
		js, _ := json.Marshal(res)
		fmt.Fprintf(w, string(js))
		return
	}
	// fmt.Println("Workgin");

	ccmd := exec.Command(cmdname)
	var cout bytes.Buffer
	var cerr bytes.Buffer
	ccmd.Stderr = &cerr
	ccmd.Stdout = &cout
	ccmd.Run()

	// stdout := cout.String()
	// stderr := cerr.String()
	// fmt.Println(stdout + "::" + stderr)

	response := CompileResponse{
		cout.String(),
		cerr.String(),
		0,
		0,
	}
	w.WriteHeader(200)

	js, _ := json.Marshal(response)
	fmt.Fprintf(w, string(js))
}

func main() {

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// CORS; TODO: actually restruct origins
		h := w.Header()
		h["Access-Control-Allow-Origin"] = []string{"*"}

		if r.Method == "GET" {
			fmt.Fprintf(w, `{"status": "running", "lang": "go"}`)
		} else if r.Method == "POST" {
			compileThem(w, r)
		} else if r.Method == "OPTIONS" {
			fmt.Fprintf(w, "Ok")
		} else {
			fmt.Fprintf(w, "Method not supported")
		}
	})

	fmt.Println("Running")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
